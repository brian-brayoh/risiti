import { normalizePhone } from "./phone";

/** Account references are compared case-insensitively with all whitespace removed. */
export function normalizeRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const r = ref.replace(/\s+/g, "").toUpperCase();
  return r.length ? r : null;
}

export type MatchCandidate = { id: string; accountRef: string; phone: string | null };

export type MatchResult =
  | { customerId: string; method: "ACCOUNT_REF" | "PHONE" }
  | { customerId: null; method: "NONE" };

/**
 * Pure matching logic (no DB) so it can be unit-tested.
 * 1. Exact account reference (what the payer typed as "Account no.")
 * 2. Phone number - only when Safaricom sends a real number (newer C2B APIs mask it)
 */
export function matchCustomer(
  billRef: string | null | undefined,
  msisdn: string | null | undefined,
  customers: MatchCandidate[],
): MatchResult {
  const ref = normalizeRef(billRef);
  if (ref) {
    const byRef = customers.find((c) => normalizeRef(c.accountRef) === ref);
    if (byRef) return { customerId: byRef.id, method: "ACCOUNT_REF" };
  }
  const phone = normalizePhone(msisdn);
  if (phone) {
    const byPhone = customers.filter((c) => normalizePhone(c.phone) === phone);
    // Only match when exactly one customer has that phone - avoid guessing.
    if (byPhone.length === 1) return { customerId: byPhone[0].id, method: "PHONE" };
  }
  return { customerId: null, method: "NONE" };
}
