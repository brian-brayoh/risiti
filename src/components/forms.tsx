"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions";

export function SubmitButton({ children, className = "btn-primary", pendingText }: {
  children: React.ReactNode; className?: string; pendingText?: string;
}) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = status.pending || ctxPending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}

const PendingContext = createContext(false);

/**
 * Form wrapper that shows the action's error / success message.
 * Submits manually (not via the form's action prop) so React 19 doesn't clear the fields
 * when validation fails - the user keeps what they typed.
 */
export function ActionForm({ action, children, className, resetOnSuccess }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      {state.error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.ok}</p>}
    </form>
  );
}

export function Field({ label, name, hint, ...props }: {
  label: string; name: string; hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} className="input" {...props} />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
