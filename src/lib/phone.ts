/** Normalise Kenyan numbers to 2547XXXXXXXX / 2541XXXXXXXX. Returns null for anything else (e.g. hashed MSISDNs). */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, "");
  let p = digits;
  if (p.startsWith("0") && p.length === 10) p = "254" + p.slice(1);
  else if ((p.startsWith("7") || p.startsWith("1")) && p.length === 9) p = "254" + p;
  return /^254[17]\d{8}$/.test(p) ? p : null;
}

export function maskPhone(p: string | null | undefined): string {
  if (!p) return "—";
  const n = normalizePhone(p);
  if (!n) return p.length > 12 ? p.slice(0, 6) + "…" : p;
  return n.slice(0, 6) + "***" + n.slice(9);
}
