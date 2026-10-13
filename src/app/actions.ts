"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { ingestC2BPayment, processPayment, notifyPayer, submitInvoiceToEtims } from "@/lib/engine";
import { normalizeRef } from "@/lib/matching";
import { registerC2BUrls } from "@/lib/mpesa";
import { normalizePhone } from "@/lib/phone";
import { ACTIVE_BIZ_COOKIE, canManage, requireBusiness, requireUser } from "@/lib/session";

export type ActionState = { error?: string; ok?: string };

const KRA_PIN = /^[AP]\d{9}[A-Z]$/;

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Invalid input";
}

async function requireManager() {
  const ctx = await requireBusiness();
  if (!canManage(ctx.membership.role)) throw new Error("Only owners and accountants can do this");
  return ctx;
}

/* ---------------- Auth ---------------- */

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) return { error: "An account with that email already exists" };
  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  await signIn("credentials", { email, password, redirectTo: "/businesses/new" });
  return {};
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Wrong email or password" };
    throw e; // let Next.js handle the redirect
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

/* ---------------- Businesses ---------------- */

const businessSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name"),
  kraPin: z.string().trim().toUpperCase().regex(KRA_PIN, "KRA PIN looks wrong (e.g. P051234567X)"),
  shortcode: z.string().trim().regex(/^\d{5,7}$/, "Paybill/Till should be 5-7 digits"),
  shortcodeType: z.enum(["PAYBILL", "TILL"]),
  vatRegistered: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  itemDescription: z.string().trim().min(2, "Describe what you sell").max(100),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/, "Prefix: 2-8 letters/numbers"),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export async function createBusinessAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = businessSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const role = fd.get("role") === "ACCOUNTANT" ? "ACCOUNTANT" : "OWNER";

  let businessId: string;
  try {
    const biz = await db.business.create({
      data: { ...parsed.data, members: { create: { userId: user.id, role } } },
    });
    businessId = biz.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That paybill/till is already registered on Risiti" };
    }
    throw e;
  }
  (await cookies()).set(ACTIVE_BIZ_COOKIE, businessId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}

export async function switchBusinessAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("businessId") ?? "");
  const m = await db.membership.findUnique({ where: { userId_businessId: { userId: user.id, businessId: id } } });
  if (m) (await cookies()).set(ACTIVE_BIZ_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

export async function updateBusinessAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireManager();
  const parsed = businessSchema
    .extend({
      smsEnabled: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
      vatRatePercent: z.coerce.number().min(0).max(100),
      etimsMode: z.enum(["MOCK", "OSCU"]),
      etimsBranchId: z.string().trim().regex(/^\d{2}$/, "Branch ID is 2 digits, e.g. 00"),
      etimsDeviceSerial: z.string().trim().optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { vatRatePercent, etimsDeviceSerial, ...rest } = parsed.data;

  try {
    await db.business.update({
      where: { id: business.id },
      data: { ...rest, vatRateBps: Math.round(vatRatePercent * 100), etimsDeviceSerial: etimsDeviceSerial || null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That paybill/till is already registered on Risiti" };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: "Settings saved" };
}

export async function registerUrlsAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  const { business } = await requireManager();
  try {
    const r = await registerC2BUrls(business.shortcode, business.webhookToken);
    return { ok: `Registered with Safaricom. Response: ${r.response.slice(0, 200)}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function addMemberAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireManager();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = fd.get("role") === "STAFF" ? "STAFF" : fd.get("role") === "OWNER" ? "OWNER" : "ACCOUNTANT";
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No Risiti account with that email. Ask them to sign up first." };
  await db.membership.upsert({
    where: { userId_businessId: { userId: user.id, businessId: business.id } },
    create: { userId: user.id, businessId: business.id, role },
    update: { role },
  });
  revalidatePath("/settings");
  return { ok: `${user.name} added as ${role.toLowerCase()}` };
}

/* ---------------- Customers ---------------- */

const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer name"),
  accountRef: z.string().trim().min(1, "Enter the account number they pay with"),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  kraPin: z.string().trim().toUpperCase().optional(),
});

export async function createCustomerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireBusiness();
  const parsed = customerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  if (d.kraPin && !KRA_PIN.test(d.kraPin)) return { error: "Customer KRA PIN looks wrong" };
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { error: "Phone should be a Kenyan number like 0712345678" };

  try {
    await db.customer.create({
      data: {
        businessId: business.id,
        name: d.name,
        accountRef: normalizeRef(d.accountRef)!,
        phone,
        email: d.email || null,
        kraPin: d.kraPin || null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Another customer already uses that account number" };
    }
    throw e;
  }
  revalidatePath("/customers");
  return { ok: `${d.name} added. Payments with account "${normalizeRef(d.accountRef)}" will match automatically.` };
}

export async function deleteCustomerAction(fd: FormData) {
  const { business } = await requireManager();
  await db.customer.deleteMany({ where: { id: String(fd.get("id")), businessId: business.id } });
  revalidatePath("/customers");
}

/* ---------------- Payments & invoices ---------------- */

export async function ignorePaymentAction(fd: FormData) {
  const { business } = await requireManager();
  await db.payment.updateMany({
    where: { id: String(fd.get("id")), businessId: business.id, status: "RECEIVED" },
    data: { status: "IGNORED" },
  });
  revalidatePath("/payments");
}

export async function processPaymentAction(fd: FormData) {
  const { business } = await requireBusiness();
  const p = await db.payment.findFirst({ where: { id: String(fd.get("id")), businessId: business.id } });
  if (p) await processPayment(p.id);
  revalidatePath("/payments");
  revalidatePath("/invoices");
}

export async function retryInvoiceAction(fd: FormData) {
  const { business } = await requireBusiness();
  const inv = await db.invoice.findFirst({ where: { id: String(fd.get("id")), businessId: business.id } });
  if (!inv) return;
  await db.invoice.update({ where: { id: inv.id }, data: { attempts: 0 } });
  const r = await submitInvoiceToEtims(inv.id);
  if (r.status === "SUBMITTED") await notifyPayer(r.id);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${inv.id}`);
}

/* ---------------- Dev simulator ---------------- */

export async function simulatePaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (process.env.ENABLE_SIMULATOR !== "true") return { error: "Simulator is disabled" };
  const { business } = await requireBusiness();

  const amount = Number(fd.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount" };
  const billRef = String(fd.get("billRef") ?? "").trim();
  const phone = normalizePhone(String(fd.get("phone") ?? "")) ?? "254700000000";

  const eat = new Date(Date.now() + 3 * 3600_000);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const transTime = `${eat.getUTCFullYear()}${p2(eat.getUTCMonth() + 1)}${p2(eat.getUTCDate())}${p2(eat.getUTCHours())}${p2(eat.getUTCMinutes())}${p2(eat.getUTCSeconds())}`;
  const transId = "SIM" + Math.random().toString(36).slice(2, 9).toUpperCase();

  const res = await ingestC2BPayment(business.webhookToken, {
    TransactionType: business.shortcodeType === "TILL" ? "Buy Goods" : "Pay Bill",
    TransID: transId,
    TransTime: transTime,
    TransAmount: amount.toFixed(2),
    BusinessShortCode: business.shortcode,
    BillRefNumber: business.shortcodeType === "TILL" ? "" : billRef,
    MSISDN: phone,
    FirstName: String(fd.get("payerName") ?? "") || "Test",
  });
  if (!res.ok) return { error: res.reason };
  const inv = await processPayment(res.paymentId);

  revalidatePath("/", "layout");
  return { ok: `Payment ${transId} received → invoice ${inv?.number ?? "-"} (${inv?.status ?? "-"})` };
}
