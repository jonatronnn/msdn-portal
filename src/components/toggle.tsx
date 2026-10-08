"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";

// A checkbox that saves as soon as it's ticked or unticked.
export function Toggle({
  checked,
  action,
  children,
}: {
  checked: boolean;
  action: (checked: boolean) => Promise<ActionState>;
  children: ReactNode;
}) {
  const [value, setValue] = useState(checked);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-teal-700"
        checked={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setValue(next);
          setError(undefined);
          startTransition(async () => {
            const result = await action(next);
            if (result?.error) {
              setValue(!next);
              setError(result.error);
            }
          });
        }}
      />
      <span>
        {children}
        {error && <span className="block text-red-700">{error}</span>}
      </span>
    </label>
  );
}
