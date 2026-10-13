import { Prisma } from "@prisma/client";
import { db } from "./db";
import { getEtimsProvider } from "./etims";
import { matchCustomer } from "./matching";
import { formatKes, splitVat } from "./money";
import { normalizeC2B, type C2BPayload } from "./mpesa";
import { sendSms } from "./sms";
import { appUrl } from "./url";

const MAX_ATTEMPTS = 10;

export function formatInvoiceNumber(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

/**
 * Step 1: store the raw payment. Idempotent on TransID - Safaricom can deliver the
 * same confirmation more than once.
 */
export async function ingestC2BPayment(webhookToken: string, payload: C2BPayload) {
  const business = await db.business.findUnique({ where: { webhookToken } });
  if (!business) return { ok: false as const, reason: "unknown-token" };

  const p = normalizeC2B(payload);
  if (p.shortcode !== business.shortcode) {
    return { ok: false as const, reason: `shortcode mismatch (${p.shortcode})` };
  }

  try {
    const payment = await db.payment.create({
      data: {
        businessId: business.id,
        transId: p.transId,
        transTime: p.transTime,
        amountCents: p.amountCents,
        billRef: p.billRef,
        msisdn: p.msisdn,
        payerName: p.payerName,
        raw: payload as Prisma.InputJsonValue,
      },
    });
    return { ok: true as const, paymentId: payment.id, duplicate: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await db.payment.findUnique({ where: { transId: p.transId } });
      return { ok: true as const, paymentId: existing!.id, duplicate: true };
    }
    throw e;
  }
}

/**
 * Step 2: match the payer to a customer and create the invoice.
 * The invoice number is allocated atomically inside the transaction, so numbers are
 * sequential with no gaps or duplicates even under concurrent callbacks.
 */
export async function createInvoiceForPayment(paymentId: string) {
  // Read-only work happens outside the transaction, so the transaction itself stays short
  // even when the database is far away (e.g. Nairobi -> us-east-2) or waking from sleep.
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { invoice: true } });
  if (!payment) throw new Error(`Payment ${paymentId} not found`);
  if (payment.invoice) return payment.invoice;
  if (payment.status === "IGNORED") return null;

  const candidates = await db.customer.findMany({
    where: { businessId: payment.businessId },
    select: { id: true, accountRef: true, phone: true },
  });
  const match = matchCustomer(payment.billRef, payment.msisdn, candidates);
  const customer = match.customerId ? await db.customer.findUnique({ where: { id: match.customerId } }) : null;

  return db.$transaction(async (tx) => {
    // Re-check inside the transaction: another worker may have invoiced this payment meanwhile.
    const existing = await tx.invoice.findUnique({ where: { paymentId: payment.id } });
    if (existing) return existing;

    const biz = await tx.business.update({
      where: { id: payment.businessId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true, invoicePrefix: true, vatRateBps: true, vatRegistered: true, itemDescription: true },
    });
    const number = formatInvoiceNumber(biz.invoicePrefix, biz.nextInvoiceNumber - 1);
    const amounts = splitVat(payment.amountCents, biz.vatRateBps, biz.vatRegistered);

    const invoice = await tx.invoice.create({
      data: {
        businessId: payment.businessId,
        customerId: customer?.id ?? null,
        paymentId: payment.id,
        number,
        issuedAt: payment.transTime,
        description: biz.itemDescription,
        buyerName: customer?.name ?? payment.payerName ?? "Walk-in customer",
        buyerPin: customer?.kraPin ?? null,
        ...amounts,
        vatRateBps: biz.vatRegistered ? biz.vatRateBps : 0,
      },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "INVOICED", customerId: customer?.id ?? null },
    });
    return invoice;
  }, { maxWait: 10_000, timeout: 20_000 });
}

/** Step 3: submit to eTIMS. Safe to call repeatedly - already-submitted invoices are skipped. */
export async function submitInvoiceToEtims(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { business: true, payment: true },
  });
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status === "SUBMITTED") return invoice;

  const b = invoice.business;
  const provider = getEtimsProvider(b.etimsMode);
  let result;
  try {
    result = await provider.submitInvoice({
      invoiceNumber: invoice.number,
      issuedAt: invoice.issuedAt,
      seller: { name: b.name, kraPin: b.kraPin, branchId: b.etimsBranchId, deviceSerial: b.etimsDeviceSerial },
      buyer: { name: invoice.buyerName, kraPin: invoice.buyerPin },
      item: { description: invoice.description, quantity: 1, unitPriceCents: invoice.subtotalCents },
      subtotalCents: invoice.subtotalCents,
      vatCents: invoice.vatCents,
      totalCents: invoice.totalCents,
      vatRateBps: invoice.vatRateBps,
      paymentReference: invoice.payment?.transId ?? null,
    });
  } catch (e) {
    result = { ok: false as const, error: e instanceof Error ? e.message : String(e), retryable: true };
  }

  if (result.ok) {
    return db.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "SUBMITTED",
        attempts: { increment: 1 },
        etimsReceiptNo: result.receiptNo,
        etimsSignature: result.signature,
        etimsVerifyUrl: result.verifyUrl,
        etimsError: null,
        submittedAt: new Date(),
      },
    });
  }
  return db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "FAILED",
      attempts: result.retryable ? { increment: 1 } : MAX_ATTEMPTS,
      etimsError: result.error.slice(0, 1000),
    },
  });
}

/** Step 4: SMS the payer their invoice link (once). */
export async function notifyPayer(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { business: true, payment: true, customer: true },
  });
  if (!invoice || invoice.smsSentAt || invoice.status !== "SUBMITTED" || !invoice.business.smsEnabled) return;

  const to = invoice.customer?.phone ?? invoice.payment?.msisdn;
  if (!to) return;

  const base = appUrl();
  const msg =
    `${invoice.business.name}: payment of ${formatKes(invoice.totalCents)} received` +
    (invoice.payment ? ` (${invoice.payment.transId})` : "") +
    `. Invoice ${invoice.number}: ${base}/r/${invoice.id}`;

  const res = await sendSms(to, msg);
  if (res.sent) await db.invoice.update({ where: { id: invoice.id }, data: { smsSentAt: new Date() } });
}

/** Full pipeline for one payment. Each step is idempotent, so this is safe to re-run. */
export async function processPayment(paymentId: string) {
  const invoice = await createInvoiceForPayment(paymentId);
  if (!invoice) return null;
  const submitted = await submitInvoiceToEtims(invoice.id);
  if (submitted.status === "SUBMITTED") await notifyPayer(submitted.id);
  return submitted;
}

/**
 * Safety net run by cron: picks up payments whose background processing never ran
 * (e.g. a cold-start timeout) and retries failed eTIMS submissions.
 */
export async function runRecovery(limit = 50) {
  const stalePayments = await db.payment.findMany({
    where: { status: "RECEIVED", createdAt: { lt: new Date(Date.now() - 60_000) } },
    select: { id: true },
    take: limit,
  });
  const failed = await db.invoice.findMany({
    where: { status: { in: ["FAILED", "PENDING"] }, attempts: { lt: MAX_ATTEMPTS }, createdAt: { lt: new Date(Date.now() - 60_000) } },
    select: { id: true },
    take: limit,
  });

  let processed = 0, retried = 0, errors = 0;
  for (const p of stalePayments) {
    try { await processPayment(p.id); processed++; } catch (e) { errors++; console.error("[recovery] payment", p.id, e); }
  }
  for (const i of failed) {
    try {
      const r = await submitInvoiceToEtims(i.id);
      if (r.status === "SUBMITTED") await notifyPayer(r.id);
      retried++;
    } catch (e) { errors++; console.error("[recovery] invoice", i.id, e); }
  }
  return { processed, retried, errors };
}
