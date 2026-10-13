import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice", robots: { index: false } };

/** Public invoice link sent to the payer by SMS. The cuid in the URL is the access key. */
export default async function PublicInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { business: true, payment: true, customer: true },
  });
  if (!invoice) notFound();
  return (
    <main className="px-4 py-10">
      <div className="mx-auto mb-4 flex max-w-2xl justify-end">
        <PrintButton label="Download PDF" />
      </div>
      <InvoiceDocument invoice={invoice} />
      <div className="no-print mt-4 text-center text-xs text-slate-400">Issued with Risiti</div>
    </main>
  );
}
