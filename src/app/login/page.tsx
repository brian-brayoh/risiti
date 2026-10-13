import Link from "next/link";
import { loginAction } from "@/app/actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Logo } from "@/components/logo";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold">Log in</h1>
          <ActionForm action={loginAction} className="mt-5 space-y-4">
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Password" name="password" type="password" required autoComplete="current-password" />
            <SubmitButton className="btn-primary w-full" pendingText="Logging in…">Log in</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          New here? <Link href="/register" className="font-medium text-brand-700">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
