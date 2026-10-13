/**
 * Public base URL of the app, used for M-Pesa callback URLs and invoice links in SMS.
 * Order: APP_URL (set this once you have a custom domain) -> Vercel's production URL
 * (set automatically by Vercel) -> localhost for development.
 */
export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
