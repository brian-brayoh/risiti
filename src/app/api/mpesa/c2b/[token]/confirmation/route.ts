import { after, NextResponse } from "next/server";
import { ingestC2BPayment, processPayment } from "@/lib/engine";
import { c2bPayloadSchema } from "@/lib/mpesa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safaricom only needs a quick 200 + ResultCode 0. Anything slow runs after the response.
const ACCEPTED = { ResultCode: 0, ResultDesc: "Accepted" };

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
  }

  const parsed = c2bPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[c2b] invalid payload", parsed.error.flatten());
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
  }

  const result = await ingestC2BPayment(token, parsed.data);
  if (!result.ok) {
    console.warn("[c2b] rejected:", result.reason);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 404 });
  }

  if (!result.duplicate) {
    after(async () => {
      try {
        await processPayment(result.paymentId);
      } catch (e) {
        console.error("[c2b] processing failed - cron will retry", result.paymentId, e);
      }
    });
  }
  return NextResponse.json(ACCEPTED);
}
