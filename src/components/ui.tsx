import type { InvoiceStatus, PaymentStatus } from "@prisma/client";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const invoiceTone: Record<InvoiceStatus, string> = {
  SUBMITTED: "bg-brand-50 text-brand-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
};
export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const label = { SUBMITTED: "eTIMS ✓", PENDING: "Pending", FAILED: "Failed" }[status];
  return <span className={`badge ${invoiceTone[status]}`}>{label}</span>;
}

const paymentTone: Record<PaymentStatus, string> = {
  INVOICED: "bg-brand-50 text-brand-700",
  RECEIVED: "bg-amber-50 text-amber-700",
  IGNORED: "bg-slate-100 text-slate-500",
};
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const label = { INVOICED: "Invoiced", RECEIVED: "Processing", IGNORED: "Ignored" }[status];
  return <span className={`badge ${paymentTone[status]}`}>{label}</span>;
}

export function Stat({ label, value, hint, tone = "default" }: {
  label: string; value: string; hint?: string; tone?: "default" | "warn" | "bad";
}) {
  const color = tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function fmtDate(d: Date) {
  return d.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
