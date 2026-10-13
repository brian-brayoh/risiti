import Link from "next/link";
import { simulatePaymentAction } from "@/app/actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { EmptyState, InvoiceBadge, PageHeader, Stat, fmtDate } from "@/components/ui";
import { currentMonth, monthRange } from "@/lib/csv";
import { db } from "@/lib/db";
import { formatKes } from "@/lib/money";
import { requireBusiness } from "@/lib/session";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const month = currentMonth();
  const [start, end] = monthRange(month);
  const where = { businessId: business.id, issuedAt: { gte: start, lt: end } };

  const [totals, walkIns, failed, recent, paymentCount] = await Promise.all([
    db.invoice.aggregate({ where, _sum: { totalCents: true, vatCents: true }, _count: true }),
    db.invoice.count({ where: { ...where, customerId: null } }),
    db.invoice.count({ where: { businessId: business.id, status: "FAILED" } }),
    db.invoice.findMany({ where: { businessId: business.id }, orderBy: { issuedAt: "desc" }, take: 8, include: { payment: true } }),
    db.payment.count({ where: { businessId: business.id } }),
  ]);

  const monthLabel = start.toLocaleString("en-KE", { month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
  const simulator = process.env.ENABLE_SIMULATOR === "true";

  return (
    <>
      <PageHeader
        title={business.name}
        subtitle={`${business.shortcodeType === "TILL" ? "Till" : "Paybill"} ${business.shortcode} · ${monthLabel}`}
        actions={<a href={`/api/export?business=${business.id}&month=${month}`} className="btn-secondary">Export {monthLabel} (CSV)</a>}
      />

      {business.etimsMode === "MOCK" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          eTIMS is in <b>simulation mode</b> - invoices are not sent to KRA yet. Switch to OSCU in Settings once your integration is approved.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Sales this month" value={formatKes(totals._sum.totalCents ?? 0)} hint={`${totals._count} invoices`} />
        <Stat label="VAT this month" value={formatKes(totals._sum.vatCents ?? 0)} hint={business.vatRegistered ? "Output VAT" : "Not VAT registered"} />
        <Stat label="Walk-in invoices" value={String(walkIns)} hint="Payments not matched to a customer" tone={walkIns ? "warn" : "default"} />
        <Stat label="eTIMS failures" value={String(failed)} hint="Retried automatically" tone={failed ? "bad" : "default"} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold">Latest invoices</h2>
            <Link href="/invoices" className="text-sm text-brand-700 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No payments yet">
              {paymentCount === 0 ? <>Finish setup in <Link className="text-brand-700 underline" href="/settings">Settings</Link>{simulator && " or send a test payment"}.</> : null}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Invoice</th><th>Buyer</th><th>M-Pesa</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {recent.map((i) => (
                    <tr key={i.id}>
                      <td><Link href={`/invoices/${i.id}`} className="font-medium text-brand-700 hover:underline">{i.number}</Link><div className="text-xs text-slate-500">{fmtDate(i.issuedAt)}</div></td>
                      <td>{i.buyerName}</td>
                      <td className="font-mono text-xs">{i.payment?.transId ?? "—"}</td>
                      <td className="text-right tabular-nums">{formatKes(i.totalCents)}</td>
                      <td><InvoiceBadge status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {simulator && (
          <div className="card p-5">
            <h2 className="font-semibold">Send a test payment</h2>
            <p className="mt-1 text-xs text-slate-500">Runs the real pipeline: payment → match → invoice → eTIMS → SMS. Dev only.</p>
            <ActionForm action={simulatePaymentAction} className="mt-4 space-y-3" resetOnSuccess>
              <Field label="Amount (KES)" name="amount" type="number" min="1" step="0.01" required defaultValue="1160" />
              {business.shortcodeType === "PAYBILL" && <Field label="Account number" name="billRef" placeholder="e.g. A101" />}
              <Field label="Phone" name="phone" placeholder="0712345678" />
              <Field label="Payer first name" name="payerName" placeholder="Wanjiku" />
              <SubmitButton pendingText="Paying…">Simulate M-Pesa payment</SubmitButton>
            </ActionForm>
          </div>
        )}
      </div>
    </>
  );
}
