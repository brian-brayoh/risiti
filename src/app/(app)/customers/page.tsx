import { createCustomerAction, deleteCustomerAction } from "@/app/actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { formatKes } from "@/lib/money";
import { maskPhone } from "@/lib/phone";
import { canManage, requireBusiness } from "@/lib/session";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ ref?: string; q?: string }> }) {
  const { business, membership } = await requireBusiness();
  const { ref, q } = await searchParams;

  const customers = await db.customer.findMany({
    where: {
      businessId: business.id,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { accountRef: { contains: q.toUpperCase() } }] } : {}),
    },
    orderBy: { name: "asc" },
    take: 500,
  });
  const totals = await db.invoice.groupBy({
    by: ["customerId"],
    where: { businessId: business.id, customerId: { in: customers.map((c) => c.id) } },
    _sum: { totalCents: true },
    _count: true,
  });
  const byId = new Map(totals.map((t) => [t.customerId, t]));

  return (
    <>
      <PageHeader title="Customers" subtitle="Payments are matched by the account number the customer types on your paybill." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card overflow-x-auto xl:col-span-2">
          <form className="border-b border-slate-100 p-3">
            <input name="q" defaultValue={q} placeholder="Search name or account no." className="input" />
          </form>
          {customers.length === 0 ? <EmptyState title="No customers yet">Add one, or save an unmatched account number from Payments.</EmptyState> : (
            <table className="table">
              <thead><tr><th>Name</th><th>Account no.</th><th>Phone</th><th>KRA PIN</th><th className="text-right">Paid (all time)</th><th></th></tr></thead>
              <tbody>
                {customers.map((c) => {
                  const t = byId.get(c.id);
                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td className="font-mono text-xs">{c.accountRef}</td>
                      <td>{maskPhone(c.phone)}</td>
                      <td className="font-mono text-xs">{c.kraPin ?? "—"}</td>
                      <td className="text-right tabular-nums">{formatKes(t?._sum.totalCents ?? 0)}<div className="text-xs text-slate-500">{t?._count ?? 0} invoices</div></td>
                      <td>{canManage(membership.role) && (
                        <form action={deleteCustomerAction}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost text-xs text-red-600">Remove</button></form>
                      )}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="card h-fit p-5">
          <h2 className="font-semibold">Add customer</h2>
          <ActionForm action={createCustomerAction} className="mt-4 space-y-3" resetOnSuccess>
            <Field label="Name" name="name" required />
            <Field label="Account number" name="accountRef" required defaultValue={ref} hint={business.shortcodeType === "TILL" ? "Tills have no account number - customers match by phone when Safaricom provides it." : "What they type as 'Account no.' when paying"} />
            <Field label="Phone" name="phone" placeholder="0712345678" />
            <Field label="Email" name="email" type="email" />
            <Field label="KRA PIN (for B2B)" name="kraPin" placeholder="P051234567X" hint="Lets the buyer claim the expense" />
            <SubmitButton pendingText="Saving…">Add customer</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
