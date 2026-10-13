/** All amounts are integer cents (KES x 100). */

export function toCents(amount: string | number): number {
  const n = typeof amount === "number" ? amount : Number(String(amount).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid amount: ${amount}`);
  return Math.round(n * 100);
}

export function formatKes(cents: number): string {
  return (
    "KES " +
    (cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/**
 * Split a VAT-inclusive total into net + VAT.
 * M-Pesa amounts are what the customer paid, so VAT is always inside the total.
 */
export function splitVat(totalCents: number, vatRateBps: number, vatRegistered: boolean) {
  if (!vatRegistered || vatRateBps <= 0) {
    return { subtotalCents: totalCents, vatCents: 0, totalCents };
  }
  const subtotalCents = Math.round((totalCents * 10000) / (10000 + vatRateBps));
  return { subtotalCents, vatCents: totalCents - subtotalCents, totalCents };
}

export function formatRate(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}
