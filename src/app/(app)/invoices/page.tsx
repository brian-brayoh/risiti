import Link from "next/link";
import { retryInvoiceAction } from "@/app/actions";
import { EmptyState, InvoiceBadge, PageHeader, fmtDate } from "@/components/ui";
import { currentMonth, monthRange } from "@/lib/csv";
import { db } from "@/lib/db";
import { formatKes } from "@/lib/money";
import { requireBusiness } from "@/lib/session";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ month?: string; status?: string }> }) {
  const { business } = await requireBusiness();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentMonth();
  const [start, end] = monthRange(month);
  const failedOnly = sp.status === "failed";

  const invoices = await db.invoice.findMany({
    where: {
      businessId: business.id,
      ...(failedOnly ? { status: "FAILED" } : { issuedAt: { gte: start, lt: end } }),
    },
    include: { payment: true },
    orderBy: { issuedAt: "desc" },
  });
  const total = invoices.reduce((s, i) => s + i.totalCents, 0);
  const vat = invoices.reduce((s, i) => s + i.vatCents, 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={failedOnly ? "Invoices eTIMS has not accepted yet" : `${invoices.length} invoices · ${formatKes(total)} · VAT ${formatKes(vat)}`}
        actions={
          <>
            <form className="flex gap-2">
              <input type="month" name="month" defaultValue={month} className="input w-auto" />
              <button className="btn-secondary">Show</button>
            </form>
            <Link href={failedOnly ? "/invoices" : "/invoices?status=failed"} className="btn-secondary">{failedOnly ? "All invoices" : "Failed only"}</Link>
            <a href={`/api/export?business=${business.id}&month=${month}`} className="btn-primary">Export CSV</a>
          </>
        }
      />
      <div className="card overflow-x-auto">
        {invoices.length === 0 ? <EmptyState title="No invoices for this period" /> : (
          <table className="table">
            <thead><tr><th>Invoice</th><th>Date</th><th>Buyer</th><th>M-Pesa</th><th className="text-right">Net</th><th className="text-right">VAT</th><th className="text-right">Total</th><th>eTIMS</th><th></th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td><Link href={`/invoices/${i.id}`} className="font-medium text-brand-700 hover:underline">{i.number}</Link></td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(i.issuedAt)}</td>
                  <td>{i.buyerName}{i.buyerPin && <div className="text-xs text-slate-500">{i.buyerPin}</div>}</td>
                  <td className="font-mono text-xs">{i.payment?.transId ?? "—"}</td>
                  <td className="text-right tabular-nums">{formatKes(i.subtotalCents)}</td>
                  <td className="text-right tabular-nums">{formatKes(i.vatCents)}</td>
                  <td className="text-right font-medium tabular-nums">{formatKes(i.totalCents)}</td>
                  <td><InvoiceBadge status={i.status} />{i.etimsError && <div className="mt-1 max-w-48 truncate text-xs text-red-600" title={i.etimsError}>{i.etimsError}</div>}</td>
                  <td>{i.status !== "SUBMITTED" && (
                    <form action={retryInvoiceAction}><input type="hidden" name="id" value={i.id} /><button className="btn-ghost text-xs">Retry</button></form>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
