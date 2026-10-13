import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

export default async function Home() {
  const session = await auth();

  return (
    <div className="landing min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          {session ? (
            <Link href="/dashboard" className="btn-primary">Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-[#3d4f45] hover:text-[#13221b]">Log in</Link>
              <Link href="/register" className="btn-primary">Create free account</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:pt-14">
          <div className="max-w-2xl">
            <h1 className="text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.03em] [text-wrap:balance] sm:text-[3.4rem] xl:text-[3.75rem]">
              The customer pays.
              <br />
              <span className="text-[#5a6b62]">The invoice writes itself.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#3d4f45]">
              Risiti watches your M-Pesa paybill or till. Each payment is matched to the customer,
              turned into a numbered invoice with VAT worked out, and sent to them by SMS. No typing, no
              end-of-month catch-up.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">Create free account</Link>
              <Link href="/login" className="btn px-4 py-3 text-base text-[#13221b] underline decoration-[#13221b]/30 underline-offset-4 hover:decoration-[#13221b]">
                I already have one
              </Link>
            </div>
          </div>

          <HeroDemo />
        </section>

        {/* ---------- What happens to a payment ---------- */}
        <section className="border-y border-[#13221b]/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-lg text-3xl font-semibold tracking-[-0.02em]">What happens to every shilling that lands</h2>
            <p className="mt-3 max-w-lg text-[#5a6b62]">About two seconds, start to finish. You don&apos;t lift a finger.</p>

            <ol className="mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
              {[
                ["Matched", "We read the account number they typed on your paybill, or their phone number, and find the customer."],
                ["Invoiced", "The next invoice number is issued, with net, VAT and the buyer's KRA PIN for business customers."],
                ["Sent", "The customer gets an SMS with a link to their invoice, which they can download as a PDF."],
                ["Ready for the books", "Your accountant exports the whole month to a spreadsheet, already matched to M-Pesa references."],
              ].map(([title, body], i) => (
                <li key={title} className="relative md:pt-10">
                  <div className="absolute left-0 right-0 top-[11px] hidden h-px bg-[#13221b]/15 md:block" aria-hidden />
                  <span className="relative grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white md:absolute md:top-0">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-semibold md:mt-0">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- For accountants ---------- */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
          <div className="max-w-lg">
            <h2 className="text-3xl font-semibold tracking-[-0.02em]">Built for the accountant, too</h2>
            <p className="mt-4 leading-relaxed text-[#3d4f45]">
              One login covers every client business. Switch between them from the sidebar, see what
              came in and what&apos;s still unmatched, and download the month in one click. No more
              chasing clients for M-Pesa statements.
            </p>
            <ul className="mt-6 space-y-2 text-[#3d4f45]">
              <li className="flex gap-3"><Tick /> Every invoice tied to its M-Pesa receipt number</li>
              <li className="flex gap-3"><Tick /> Unmatched payments flagged, not lost</li>
              <li className="flex gap-3"><Tick /> Net, VAT and totals ready for the VAT return</li>
            </ul>
          </div>
          <ExportPreview />
        </section>

        {/* ---------- Honest status + CTA ---------- */}
        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <div className="rounded-2xl bg-[#13221b] px-6 py-10 text-white sm:px-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Try it with a test payment</h2>
                <p className="mt-3 leading-relaxed text-white/70">
                  Create an account, add your business and send a pretend M-Pesa payment from the dashboard.
                  Direct submission to KRA eTIMS is being certified now. Until it&apos;s live, invoices are clearly
                  marked as test invoices.
                </p>
              </div>
              <Link href="/register" className="btn shrink-0 bg-white px-6 py-3 text-base text-[#13221b] hover:bg-brand-50">
                Create free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[#13221b]/10 px-5 py-8 text-sm text-[#5a6b62] sm:px-8">
        <Logo />
        <span>Made in Nairobi by BMM Creations</span>
      </footer>
    </div>
  );
}

/* The memorable bit: an M-Pesa confirmation turning into an invoice slip. */
function HeroDemo() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto" aria-label="Example: an M-Pesa payment becomes an invoice">
      {/* SMS the business receives */}
      <div className="anim-sms relative z-10 ml-auto w-[88%] rounded-2xl rounded-tr-sm bg-[#d9f2e1] p-4 font-mono text-[13px] leading-relaxed text-[#13221b] shadow-[0_1px_0_rgba(19,34,27,.08)]">
        <div className="mb-1 font-sans text-xs font-semibold text-[#1f7a45]">M-PESA</div>
        SJK3QX81LM Confirmed. Ksh23,200.00 received from BARAKA BUILDERS 0711***111. Account BB01. New Utility balance…
      </div>

      {/* Invoice slip */}
      <div className="anim-slip slip-edge relative -mt-2 ml-2 w-[92%] bg-white px-6 pb-9 pt-7 shadow-[0_18px_40px_-18px_rgba(19,34,27,.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold">Kamau Hardware Ltd</div>
            <div className="font-mono text-xs text-[#5a6b62]">PIN P051234567X</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#5a6b62]">Tax invoice</div>
            <div className="font-mono text-sm font-medium">KH-000214</div>
          </div>
        </div>

        <div className="mt-5 border-t border-dashed border-[#13221b]/25 pt-4 text-sm">
          <div className="text-[#5a6b62]">Billed to</div>
          <div className="font-medium">Baraka Builders <span className="font-mono text-xs text-[#5a6b62]">P051111111A</span></div>
        </div>

        <dl className="mt-4 space-y-1.5 font-mono text-sm">
          <div className="flex justify-between"><dt className="text-[#5a6b62]">Hardware supplies</dt><dd>20,000.00</dd></div>
          <div className="flex justify-between"><dt className="text-[#5a6b62]">VAT 16%</dt><dd>3,200.00</dd></div>
          <div className="flex justify-between border-t border-dashed border-[#13221b]/25 pt-2 font-medium"><dt>Total paid</dt><dd>23,200.00</dd></div>
        </dl>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-[#5a6b62]">M-Pesa ref SJK3QX81LM</span>
          <span className="anim-stamp rotate-[-8deg] rounded-md border-2 border-brand-600 px-2.5 py-1 text-xs font-semibold text-brand-700">
            SMS sent
          </span>
        </div>
      </div>
    </div>
  );
}

function ExportPreview() {
  const rows = [
    ["KH-000214", "Baraka Builders", "20,000.00", "3,200.00", "SJK3QX81LM"],
    ["KH-000215", "Achieng Otieno", "1,000.00", "160.00", "SJK4AB22PQ"],
    ["KH-000216", "Mutua Construction", "50,000.00", "8,000.00", "SJK4CD90XZ"],
    ["KH-000217", "Walk-in (JAMES)", "500.00", "80.00", "SJK5EF13RT"],
  ];
  return (
    <figure className="overflow-hidden rounded-xl border border-[#13221b]/12 bg-white shadow-[0_18px_40px_-24px_rgba(19,34,27,.35)]">
      <figcaption className="flex items-center justify-between border-b border-[#13221b]/10 px-4 py-3 text-sm">
        <span className="font-medium">kamau-hardware-invoices-2026-10.csv</span>
        <span className="text-[#5a6b62]">4 of 312 rows</span>
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] whitespace-nowrap text-left text-sm">
          <thead className="text-[#5a6b62]">
            <tr>
              <th className="px-4 py-2 font-medium">Invoice</th>
              <th className="px-4 py-2 font-medium">Buyer</th>
              <th className="px-4 py-2 text-right font-medium">Net</th>
              <th className="px-4 py-2 text-right font-medium">VAT</th>
              <th className="px-4 py-2 font-medium">M-Pesa</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[13px]">
            {rows.map((r) => (
              <tr key={r[0]} className="border-t border-[#13221b]/8">
                <td className="px-4 py-2.5">{r[0]}</td>
                <td className="px-4 py-2.5 font-sans">{r[1]}</td>
                <td className="px-4 py-2.5 text-right">{r[2]}</td>
                <td className="px-4 py-2.5 text-right">{r[3]}</td>
                <td className="px-4 py-2.5">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden>
      <path fill="currentColor" d="M8.1 14.3 3.8 10l1.4-1.4 2.9 2.9 6.7-6.7 1.4 1.4z" />
    </svg>
  );
}
