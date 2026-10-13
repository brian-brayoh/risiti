import { normalizePhone } from "./phone";

/**
 * Africa's Talking SMS. If AT_API_KEY is empty, messages are logged instead of sent,
 * so the whole flow works locally without an SMS account.
 */
export async function sendSms(to: string, message: string): Promise<{ sent: boolean; detail: string }> {
  const phone = normalizePhone(to);
  if (!phone) return { sent: false, detail: "No valid phone number" };

  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || "sandbox";
  if (!apiKey) {
    console.log(`[sms:dry-run] to=+${phone} :: ${message}`);
    return { sent: true, detail: "dry-run (AT_API_KEY not set)" };
  }

  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to: `+${phone}`, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);

  const res = await fetch(`${host}/version1/messaging`, {
    method: "POST",
    headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  return { sent: res.ok, detail: text.slice(0, 500) };
}
