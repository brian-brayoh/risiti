import Link from "next/link";
import { registerAction } from "@/app/actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Logo } from "@/components/logo";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Business owners and accountants both start here.</p>
          <ActionForm action={registerAction} className="mt-5 space-y-4">
            <Field label="Full name" name="name" required autoComplete="name" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" hint="At least 8 characters" />
            <SubmitButton className="btn-primary w-full" pendingText="Creating…">Create account</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have one? <Link href="/login" className="font-medium text-brand-700">Log in</Link>
        </p>
      </div>
    </main>
  );
}
