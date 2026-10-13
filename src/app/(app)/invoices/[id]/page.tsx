import Link from "next/link";
import { notFound } from "next/navigation";
import { retryInvoiceAction } from "@/app/actions";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";
import { InvoiceBadge, fmtDate } from "@/components/ui";
import { db } from "@/lib/db";
import { requireBusiness } from "@/lib/session";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business } = await requireBusiness();
  const invoice = await db.invoice.findFirst({
    where: { id, businessId: business.id },
    include: { business: true, payment: true, customer: true },
  });
  if (!invoice) notFound();

  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className="text-sm text-slate-500 hover:text-slate-900">← Invoices</Link>
        <div className="flex items-center gap-2">
          <InvoiceBadge status={invoice.status} />
          {invoice.status !== "SUBMITTED" && (
            <form action={retryInvoiceAction}><input type="hidden" name="id" value={invoice.id} /><button className="btn-secondary">Retry eTIMS</button></form>
          )}
          <Link href={`/r/${invoice.id}`} target="_blank" className="btn-secondary">Customer link</Link>
          <PrintButton className="btn-primary" />
        </div>
      </div>
      {invoice.etimsError && invoice.status !== "SUBMITTED" && (
        <div className="no-print mx-auto mb-4 max-w-2xl rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Last eTIMS error ({invoice.attempts} attempts): {invoice.etimsError}
        </div>
      )}
      <InvoiceDocument invoice={invoice} />
      <p className="no-print mx-auto mt-3 max-w-2xl text-xs text-slate-500">
        {invoice.smsSentAt ? `SMS sent ${fmtDate(invoice.smsSentAt)}` : "SMS not sent (sent once eTIMS confirms, if a phone number is known)"}
      </p>
    </>
  );
}
