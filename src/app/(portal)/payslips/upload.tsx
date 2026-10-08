"use client";

import { useState } from "react";
import { buttonClass, Field, Input } from "@/components/ui";
import { uploadPayslip, type UploadResult } from "./actions";

export function PayslipUpload({ maxFileMb }: { maxFileMb: number }) {
  const [results, setResults] = useState<{ name: string; result?: UploadResult }[]>([]);
  const [busy, setBusy] = useState(false);

  async function upload(form: HTMLFormElement) {
    const data = new FormData(form);
    const payDate = String(data.get("pay_date"));
    const files = data.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    setBusy(true);
    setResults(files.map((f) => ({ name: f.name })));
    for (const [i, file] of files.entries()) {
      const one = new FormData();
      one.set("pay_date", payDate);
      one.set("file", file);
      const result = await uploadPayslip(one).catch(() => ({ ok: false as const, error: "Upload failed." }));
      setResults((r) => r.map((row, j) => (j === i ? { ...row, result } : row)));
    }
    setBusy(false);
    form.reset();
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void upload(e.currentTarget);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pay date">
          <Input name="pay_date" type="date" required />
        </Field>
        <Field label="Payslip PDFs" hint={`Each file name must include the employee's payroll ID. Up to ${maxFileMb}MB each.`}>
          <Input name="files" type="file" accept="application/pdf" multiple required />
        </Field>
      </div>
      <button type="submit" disabled={busy} className={buttonClass()}>
        {busy ? "Uploading…" : "Upload payslips"}
      </button>
      {results.length > 0 && (
        <ul className="space-y-1 text-sm">
          {results.map((r, i) => (
            <li key={i}>
              <span className="font-mono text-xs">{r.name}</span> —{" "}
              {!r.result ? (
                <span className="text-stone-500">waiting…</span>
              ) : r.result.ok ? (
                <span className="text-green-700">saved for {r.result.employee}</span>
              ) : (
                <span className="text-red-700">{r.result.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
