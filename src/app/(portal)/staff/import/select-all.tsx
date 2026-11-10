"use client";

// Ticks or unticks every enabled checkbox with this name in the same form.
export function SelectAll({ name }: { name: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        className="h-4 w-4 accent-teal-700"
        onChange={(e) =>
          e.currentTarget.form
            ?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:not(:disabled)`)
            .forEach((box) => (box.checked = e.currentTarget.checked))
        }
      />
      Select all
    </label>
  );
}
