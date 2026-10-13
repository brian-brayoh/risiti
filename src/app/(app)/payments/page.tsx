import Link from "next/link";
import { ignorePaymentAction, processPaymentAction } from "@/app/actions";
import { EmptyState, PageHeader, PaymentBadge, fmtDate } from "@/components/ui";
import { db } from "@/lib/db";
import { formatKes } from "@/lib/money";
import { maskPhone } from "@/lib/phone";
import { canManage, requireBusiness } from "@/lib/session";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { business, membership } = await requireBusiness();
  const { filter } = await searchParams;
  const manager = canManage(membership.role);

  const payments = await db.payment.findMany({
    where: {
      businessId: business.id,
      ...(filter === "unmatched" ? { customerId: null, status: { not: "IGNORED" } } : {}),
    },
    include: { customer: true, invoice: true },
    orderBy: { transTime: "desc" },
    take: 200,
  });

  const tabs = [["all", "All"], ["unmatched", "Unmatched"]] as const;

  return (
    <>
      <PageHeader title="Payments" subtitle="Every M-Pesa confirmation Safaricom sent us (latest 200)." />
      <div className="mb-4 flex gap-2">
        {tabs.map(([k, label]) => (
          <Link key={k} href={k === "all" ? "/payments" : `/payments?filter=${k}`}
            className={`badge px-3 py-1 text-sm ${(filter ?? "all") === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {label}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {payments.length === 0 ? <EmptyState title="Nothing here yet" /> : (
          <table className="table">
            <thead><tr><th>M-Pesa ref</th><th>Payer</th><th>Account no.</th><th>Customer</th><th className="text-right">Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td><div className="font-mono text-xs">{p.transId}</div><div className="text-xs text-slate-500">{fmtDate(p.transTime)}</div></td>
                  <td>{p.payerName ?? "—"}<div className="text-xs text-slate-500">{maskPhone(p.msisdn)}</div></td>
                  <td className="font-mono text-xs">{p.billRef ?? "—"}</td>
                  <td>
                    {p.customer ? p.customer.name : (
                      <span className="text-amber-700">
                        No match
                        {p.billRef && (
                          <Link href={`/customers?ref=${encodeURIComponent(p.billRef)}`} className="ml-2 text-xs text-brand-700 underline">save as customer</Link>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="text-right tabular-nums">{formatKes(p.amountCents)}</td>
                  <td><PaymentBadge status={p.status} /></td>
                  <td className="whitespace-nowrap text-right">
                    {p.invoice && <Link href={`/invoices/${p.invoice.id}`} className="text-sm text-brand-700 hover:underline">{p.invoice.number}</Link>}
                    {p.status === "RECEIVED" && (
                      <div className="flex justify-end gap-1">
                        <form action={processPaymentAction}><input type="hidden" name="id" value={p.id} /><button className="btn-ghost text-xs">Invoice now</button></form>
                        {manager && <form action={ignorePaymentAction}><input type="hidden" name="id" value={p.id} /><button className="btn-ghost text-xs">Ignore</button></form>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Unmatched payments are still invoiced to the payer as a walk-in customer. Saving the account number as a customer makes future payments match automatically.
      </p>
    </>
  );
}
