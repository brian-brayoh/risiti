# Risiti

**Every M-Pesa payment becomes a KRA eTIMS invoice - automatically.**

A business connects its paybill or till once. For every payment Safaricom confirms, Risiti:

1. Stores it (idempotent on the M-Pesa receipt number - duplicate callbacks are ignored)
2. Matches the payer to a customer by account number, falling back to phone
3. Issues a sequential invoice (`PREFIX-000001`), splitting VAT out of the amount paid
4. Submits it to eTIMS (simulated until your KRA integration is approved)
5. SMSes the payer a link to their invoice
6. Gives the accountant a one-click month-end CSV, across all their client businesses

Stack: Next.js 15 (App Router) · TypeScript · Tailwind · Prisma 6 · Neon Postgres · Auth.js v5 · Vercel.

---

## Run it locally (PowerShell)

```powershell
# 1. Unzip into C:\dev\risiti, then:
Set-Location C:\dev\risiti
npm install

# 2. Environment
Copy-Item .env.example .env
npx auth secret            # writes AUTH_SECRET into .env.local - or paste one into .env
notepad .env               # set DATABASE_URL + DIRECT_URL from Neon (pooled + direct)

# 3. Database
npx prisma migrate dev --name init
npx prisma db seed         # demo data -> login demo@risiti.test / demo12345

# 4. Go
npm run dev                # http://localhost:3000
```

With `ENABLE_SIMULATOR=true`, the Overview page has a **Send a test payment** panel that runs the real
pipeline end to end. SMS messages print to the terminal until you add Africa's Talking keys.

### Fire a fake Safaricom callback

Get the business's callback URL from **Settings → Connect M-Pesa**, then:

```powershell
$url  = "http://localhost:3000/api/mpesa/c2b/<webhookToken>/confirmation"
$body = @{
  TransactionType   = "Pay Bill"
  TransID           = "TEST" + (Get-Random -Maximum 999999)
  TransTime         = (Get-Date -Format "yyyyMMddHHmmss")
  TransAmount       = "1160.00"
  BusinessShortCode = "600984"
  BillRefNumber     = "BB01"
  MSISDN            = "254711111111"
  FirstName         = "JOHN"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri $url -ContentType "application/json" -Body $body
```

Expected reply: `ResultCode 0, Accepted`. Send the same `TransID` twice and you still get one invoice.

### Tests

```powershell
npm test          # VAT maths, matching, phone normalisation, Daraja parsing, CSV
npm run typecheck
```

---

## Deploy (Vercel + Neon)

1. Push to GitHub, import into Vercel.
2. Add every variable from `.env.example` (set `APP_URL` to your Vercel URL, `ENABLE_SIMULATOR=false`).
3. Build command is already `prisma generate && next build`. Run migrations from your machine:
   `npx prisma migrate deploy` (uses `DIRECT_URL`).
4. `vercel.json` runs `/api/cron/retry-etims` once a day (03:00 UTC), the most the free Hobby plan
   allows. It picks up any payment whose background processing didn't finish and retries failed
   eTIMS submissions. Vercel sends `CRON_SECRET` automatically. Once you have paying customers, move
   to Pro and change the schedule to `*/15 * * * *` (or hit the endpoint from an external scheduler
   with `Authorization: Bearer <CRON_SECRET>`).
5. `APP_URL` is optional on Vercel - the app falls back to Vercel's production URL. Set it when you
   add a custom domain.

### Connect a real paybill (Daraja)

1. Create an app on the Safaricom developer portal, put the consumer key/secret in env.
2. Callback URLs must be public HTTPS - use the Vercel URL (or ngrok locally).
3. **Settings → Register URLs with Safaricom.** For production shortcodes, Safaricom must have the
   C2B product enabled on the shortcode first (go-live process on the portal).
4. If Safaricom rejects the URL as invalid, it may be because the path contains `mpesa`. Rename the
   folder `src/app/api/mpesa` to e.g. `src/app/api/pay` and re-register.
5. Newer C2B API versions may mask or hash the payer's phone number. Matching by account number is
   the reliable path - that's why paybill customers are keyed on `accountRef`.

---

## Going live with KRA eTIMS - read this

eTIMS runs in **simulated mode** by default. Invoices are clearly stamped
*"SIMULATED eTIMS - NOT A VALID TAX INVOICE"* until you switch a business to OSCU.

`src/lib/etims/oscu.ts` is intentionally a stub. Real submission requires:

1. Applying to KRA for eTIMS OSCU integration (third-party integrator approval)
2. KRA's OSCU technical specification and sandbox credentials
3. Device initialisation per taxpayer branch (gives the device serial)
4. Passing KRA's integration tests

Once you have the spec, implement `submitInvoice()` in that one file. Numbering, retries,
SMS, receipts and exports already work through the `EtimsProvider` interface.

---

## How it fits together

```
Safaricom ──POST──▶ /api/mpesa/c2b/[token]/confirmation
                         │  validate + store Payment (unique TransID)  → 200 "Accepted" immediately
                         ▼  after():
                    createInvoiceForPayment   match customer · atomic invoice number · VAT split
                         ▼
                    submitInvoiceToEtims      Mock or OSCU provider · FAILED → retried by cron
                         ▼
                    notifyPayer               SMS with /r/[invoiceId] public link (sent once)
```

| Path | What |
|---|---|
| `src/lib/engine.ts` | The pipeline. Every step is idempotent and safe to re-run. |
| `src/lib/matching.ts` | Pure matching logic (unit-tested) |
| `src/lib/money.ts` | Integer-cents money + VAT-inclusive split |
| `src/lib/mpesa.ts` | Daraja payload schema, time parsing, URL registration |
| `src/lib/etims/` | Provider interface, simulator, OSCU stub |
| `src/app/(app)/` | Dashboard: overview, payments, invoices, customers, settings |
| `src/app/r/[id]` | Public invoice page sent to payers |
| `src/app/api/export` | Accountant CSV (`?business=&month=YYYY-MM`) |

**Multi-tenant:** a user can belong to many businesses (`Membership`). Accountants switch between
clients from the sidebar; every query is scoped to the active business and membership is checked.

**Money:** stored as integer cents. VAT is backed out of the paid amount
(`net = total × 10000 / (10000 + rateBps)`), and net + VAT always equals exactly what was paid.

---

## Known limits of this MVP

- One invoice line per payment (the business's "invoice line" text). Itemised invoices need a
  product catalogue - good next feature.
- An invoice issued to a walk-in can't be re-assigned to a customer afterwards (that needs a KRA
  credit note). Saving the account number as a customer fixes all *future* payments.
- No billing for Risiti itself yet - add a subscription per business before launch.
- Next module planned: **payroll** (PAYE, SHIF, NSSF, Housing Levy, M-Pesa B2C salaries).
