"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { buttonClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";

// A form bound to a server action that returns { error } or { message }.
// Shows the result and disables the submit button while it runs.
export function ActionForm({
  action,
  submitLabel,
  variant = "primary",
  className = "space-y-4",
  confirm,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  confirm?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form only after a successful save.
  useEffect(() => {
    if (state?.message) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        // Submitting by hand stops React clearing what was typed when the
        // action returns an error.
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass(variant)}>
          {pending ? "Working…" : submitLabel}
        </button>
        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
      </div>
    </form>
  );
}
