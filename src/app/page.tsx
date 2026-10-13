import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

export default async function Home() {
  const session = await auth();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <nav className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          {session ? (
            <Link href="/dashboard" className="btn-primary">Open dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Log in</Link>
              <Link href="/register" className="btn-primary">Start free</Link>
            </>
          )}
        </div>
      </nav>

      <section className="py-20">
        <p className="badge bg-brand-50 text-brand-700">For Kenyan businesses on M-Pesa</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Every M-Pesa payment becomes an eTIMS invoice. Automatically.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Connect your paybill or till once. Risiti matches each payment to the customer, issues a
          KRA-compliant invoice, and texts it to them - while your accountant gets clean month-end books.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">Create account</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">I have an account</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Customer pays", "They pay your paybill with their account number, or your till, like always."],
          ["2. Invoice issued", "Risiti matches the payment, splits VAT, numbers the invoice and submits it to eTIMS."],
          ["3. Everyone's sorted", "Customer gets an SMS link to their invoice. Your accountant exports the month in one click."],
        ].map(([t, d]) => (
          <div key={t} className="card p-6">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
