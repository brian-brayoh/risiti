import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Accept everything. Validation is only called if External Validation is enabled on the shortcode. */
export async function POST() {
  return NextResponse.json({ ResultCode: "0", ResultDesc: "Accepted" });
}
