import { z } from "zod";
import { toCents } from "./money";
import { appUrl } from "./url";

/**
 * Safaricom Daraja C2B integration.
 * Callback payload reference: Daraja "C2B Register URL" API docs.
 */

const BASE = () =>
  process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

export const c2bPayloadSchema = z.object({
  TransactionType: z.string().optional(),
  TransID: z.string().min(1),
  TransTime: z.string().regex(/^\d{14}$/),
  TransAmount: z.union([z.string(), z.number()]),
  BusinessShortCode: z.union([z.string(), z.number()]).transform(String),
  BillRefNumber: z.string().optional().nullable(),
  InvoiceNumber: z.string().optional().nullable(),
  OrgAccountBalance: z.union([z.string(), z.number()]).optional().nullable(),
  ThirdPartyTransID: z.string().optional().nullable(),
  MSISDN: z.union([z.string(), z.number()]).optional().nullable(),
  FirstName: z.string().optional().nullable(),
  MiddleName: z.string().optional().nullable(),
  LastName: z.string().optional().nullable(),
});

export type C2BPayload = z.infer<typeof c2bPayloadSchema>;

/** Daraja sends TransTime as YYYYMMDDHHmmss in East Africa Time (UTC+3). */
export function parseTransTime(t: string): Date {
  const y = +t.slice(0, 4), mo = +t.slice(4, 6), d = +t.slice(6, 8);
  const h = +t.slice(8, 10), mi = +t.slice(10, 12), s = +t.slice(12, 14);
  return new Date(Date.UTC(y, mo - 1, d, h - 3, mi, s));
}

export function normalizeC2B(p: C2BPayload) {
  const name = [p.FirstName, p.MiddleName, p.LastName].filter(Boolean).join(" ").trim();
  return {
    transId: p.TransID.trim(),
    transTime: parseTransTime(p.TransTime),
    amountCents: toCents(p.TransAmount),
    shortcode: p.BusinessShortCode.trim(),
    billRef: p.BillRefNumber?.trim() || null,
    msisdn: p.MSISDN != null ? String(p.MSISDN).trim() || null : null,
    payerName: name || null,
  };
}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET are not set");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${BASE()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Daraja auth failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Daraja auth returned no access_token");
  return json.access_token;
}

export function callbackUrls(webhookToken: string) {
  const base = appUrl();
  return {
    confirmation: `${base}/api/mpesa/c2b/${webhookToken}/confirmation`,
    validation: `${base}/api/mpesa/c2b/${webhookToken}/validation`,
  };
}

/**
 * Register confirmation/validation URLs for a shortcode.
 * Note: Safaricom rejects callback URLs containing words like "mpesa" or "safaricom" on some
 * environments. If registration fails with an invalid URL error, rename the route folder.
 */
export async function registerC2BUrls(shortcode: string, webhookToken: string) {
  const token = await getAccessToken();
  const urls = callbackUrls(webhookToken);
  const res = await fetch(`${BASE()}/mpesa/c2b/v2/registerurl`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ShortCode: shortcode,
      ResponseType: "Completed", // if our validation URL is down, still complete the payment
      ConfirmationURL: urls.confirmation,
      ValidationURL: urls.validation,
    }),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Register URL failed (${res.status}): ${text}`);
  return { urls, response: text };
}
