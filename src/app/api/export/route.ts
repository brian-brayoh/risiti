import { auth } from "@/auth";
import { db } from "@/lib/db";
import { monthRange, toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Month-end export for the accountant: /api/export?business=<id>&month=YYYY-MM */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const businessId = url.searchParams.get("business") ?? "";
  const month = url.searchParams.get("month") ?? "";

  const member = await db.membership.findUnique({
    where: { userId_businessId: { userId: session.user.id, businessId } },
    include: { business: true },
  });
  if (!member) return new Response("Not found", { status: 404 });

  let range: [Date, Date];
  try { range = monthRange(month); } catch { return new Response("month must be YYYY-MM", { status: 400 }); }

  const invoices = await db.invoice.findMany({
    where: { businessId, issuedAt: { gte: range[0], lt: range[1] } },
    include: { payment: true },
    orderBy: { issuedAt: "asc" },
  });

  const fmt = (c: number) => (c / 100).toFixed(2);
  const csv = toCsv([
    ["Invoice No", "Date (EAT)", "Buyer", "Buyer PIN", "Description", "Net (KES)", "VAT (KES)", "Total (KES)",
     "VAT rate", "M-Pesa Ref", "Account Ref", "eTIMS Status", "eTIMS Receipt", "eTIMS Signature"],
    ...invoices.map((i) => [
      i.number,
      new Date(i.issuedAt.getTime() + 3 * 3600_000).toISOString().replace("T", " ").slice(0, 19),
      i.buyerName, i.buyerPin, i.description,
      fmt(i.subtotalCents), fmt(i.vatCents), fmt(i.totalCents),
      `${i.vatRateBps / 100}%`, i.payment?.transId, i.payment?.billRef,
      i.status, i.etimsReceiptNo, i.etimsSignature,
    ]),
  ]);

  const safeName = member.business.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-invoices-${month}.csv"`,
    },
  });
}
