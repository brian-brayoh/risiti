import type { Business, Customer, Invoice, Payment } from "@prisma/client";
import { formatKes, formatRate } from "@/lib/money";
import { fmtDate } from "./ui";

type Full = Invoice & { business: Business; payment: Payment | null; customer: Customer | null };

export function InvoiceDocument({ invoice }: { invoice: Full }) {
  const b = invoice.business;
  const simulated = b.etimsMode === "MOCK";
  return (
    <article className="card mx-auto max-w-2xl p-8 print:border-0 print:shadow-none">
      {simulated && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
          SIMULATED eTIMS - NOT A VALID TAX INVOICE
        </div>
      )}
      <header className="flex flex-wrap justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold">{b.name}</h1>
          <div className="mt-1 space-y-0.5 text-sm text-slate-500">
            <div>KRA PIN: {b.kraPin}</div>
            {b.address && <div>{b.address}</div>}
            {b.phone && <div>{b.phone}</div>}
            {b.email && <div>{b.email}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">Tax invoice</div>
          <div className="text-lg font-semibold">{invoice.number}</div>
          <div className="text-sm text-slate-500">{fmtDate(invoice.issuedAt)}</div>
        </div>
      </header>

      <section className="mt-8 grid gap-4 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <div className="label">Billed to</div>
          <div className="font-medium">{invoice.buyerName}</div>
          {invoice.buyerPin && <div className="text-slate-500">PIN: {invoice.buyerPin}</div>}
          {invoice.customer?.accountRef && <div className="text-slate-500">Account: {invoice.customer.accountRef}</div>}
        </div>
        <div className="sm:text-right">
          <div className="label">Paid via M-Pesa</div>
          <div className="font-mono">{invoice.payment?.transId ?? "—"}</div>
        </div>
      </section>

      <table className="table mt-8">
        <thead><tr><th>Description</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          <tr><td>{invoice.description}</td><td className="text-right">1</td><td className="text-right tabular-nums">{formatKes(invoice.subtotalCents)}</td></tr>
        </tbody>
      </table>

      <dl className="ml-auto mt-4 w-64 space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">Net</dt><dd className="tabular-nums">{formatKes(invoice.subtotalCents)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">VAT {invoice.vatRateBps ? formatRate(invoice.vatRateBps) : "(exempt / not registered)"}</dt><dd className="tabular-nums">{formatKes(invoice.vatCents)}</dd></div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><dt>Total paid</dt><dd className="tabular-nums">{formatKes(invoice.totalCents)}</dd></div>
      </dl>

      <footer className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500">
        {invoice.status === "SUBMITTED" ? (
          <div className="space-y-0.5">
            <div>eTIMS receipt: <span className="font-mono text-slate-700">{invoice.etimsReceiptNo}</span></div>
            <div>Signature: <span className="font-mono text-slate-700">{invoice.etimsSignature}</span></div>
            {invoice.etimsVerifyUrl && <div>Verify: <a className="text-brand-700 underline" href={invoice.etimsVerifyUrl}>{invoice.etimsVerifyUrl}</a></div>}
          </div>
        ) : (
          <div>eTIMS submission pending - this invoice will be updated once KRA confirms it.</div>
        )}
      </footer>
    </article>
  );
}
