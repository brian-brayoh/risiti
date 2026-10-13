export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? "" : String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

/** "2026-10" -> [start, end) in EAT, returned as UTC Dates. */
export function monthRange(ym: string): [Date, Date] {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) throw new Error("Month must be YYYY-MM");
  const y = +m[1], mo = +m[2];
  return [new Date(Date.UTC(y, mo - 1, 1, -3)), new Date(Date.UTC(y, mo, 1, -3))];
}

export function currentMonth(): string {
  const now = new Date(Date.now() + 3 * 3600_000); // EAT
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
