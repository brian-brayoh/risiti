"use client";

/** Opens the browser print dialog. Choose "Save as PDF" as the printer to download a PDF. */
export function PrintButton({ className = "btn-secondary", label = "Print / Save PDF" }: { className?: string; label?: string }) {
  return (
    <button type="button" className={`no-print ${className}`} onClick={() => window.print()}>
      {label}
    </button>
  );
}
