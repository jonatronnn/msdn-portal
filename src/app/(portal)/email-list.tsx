"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";

// Pick current staff and get their email addresses as one list to paste into
// an email.
export function EmailList({ staff }: { staff: { id: string; name: string; email: string }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const allSelected = staff.length > 0 && selected.size === staff.length;
  const addresses = staff
    .filter((s) => selected.has(s.id))
    .map((s) => s.email)
    .join(", ");

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setCopied(false);
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-700"
          checked={allSelected}
          onChange={() => {
            setSelected(allSelected ? new Set() : new Set(staff.map((s) => s.id)));
            setCopied(false);
          }}
        />
        Select all ({staff.length})
      </label>
      <div className="grid gap-1 sm:grid-cols-2">
        {staff.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
            {s.name}
          </label>
        ))}
      </div>
      <textarea
        readOnly
        rows={3}
        value={addresses}
        aria-label="Selected email addresses"
        placeholder="Tick the people you want to email."
        className="block w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!addresses}
          className={buttonClass("secondary")}
          onClick={async () => {
            await navigator.clipboard.writeText(addresses);
            setCopied(true);
          }}
        >
          Copy {selected.size} address{selected.size === 1 ? "" : "es"}
        </button>
        {copied && <span className="text-sm text-green-700">Copied</span>}
        <span className="text-xs text-stone-500">Paste into Bcc so staff don&apos;t see each other&apos;s addresses.</span>
      </div>
    </div>
  );
}
