"use client";

import { useState } from "react";
import { buttonClass, Card, Field, Input } from "@/components/ui";
import { signatureHtml, signaturePlain, signatureShort } from "@/lib/signature";

const BLOCKED = "Your browser blocked copying. Select the text and copy it with Ctrl+C or Cmd+C.";

// Fill in a name and role, see the signature as it will look in an email, and
// copy it as formatted text, HTML code or plain text.
export function SignatureGenerator({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string }>();

  const shownName = name.trim() || "Your name";
  const shownRole = role.trim();
  const html = signatureHtml(shownName, shownRole);
  const plain = signaturePlain(shownName, shownRole);
  const short = signatureShort(shownName);

  async function copy(write: () => Promise<void>, done: string) {
    try {
      await write();
      setStatus({ ok: true, text: done });
    } catch {
      setStatus({ ok: false, text: BLOCKED });
    }
  }
  const copyText = (text: string, done: string) => copy(() => navigator.clipboard.writeText(text), done);
  const copyRich = () =>
    copy(
      () =>
        navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]),
      "Copied. Paste it into your email app's signature settings.",
    );

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card>
          <div className="space-y-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Role" hint="For example Room Leader or Management Team.">
              <Input value={role} onChange={(e) => setRole(e.target.value)} autoComplete="off" />
            </Field>
            <div className="flex flex-col gap-2">
              <button type="button" className={buttonClass()} onClick={copyRich}>
                Copy signature
              </button>
              <button type="button" className={buttonClass("secondary")} onClick={() => copyText(html, "HTML code copied.")}>
                Copy HTML code
              </button>
            </div>
            {status && (
              <p role="status" className={`text-sm ${status.ok ? "text-green-700" : "text-amber-700"}`}>
                {status.text}
              </p>
            )}
            <p className="text-xs text-stone-500">
              The logo loads from montagu-square.co.uk. If that file is renamed or deleted on the website, everyone
              needs to update their signature.
            </p>
          </div>
        </Card>
        <Card title="Preview">
          <div className="overflow-x-auto rounded-lg bg-white p-4 ring-1 ring-stone-200">
            <p className="mb-4 font-[Arial,Helvetica,sans-serif] text-[15px] text-[#2B2B2B]">Kind regards,</p>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </Card>
      </div>
      <Card title="Plain text versions">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            ["Full plain text", plain, "Plain text copied."],
            ["Short phone version", short, "Phone version copied."],
          ].map(([label, text, done]) => (
            <div key={label} className="min-w-0 space-y-2">
              <h3 className="text-sm font-medium text-stone-800">{label}</h3>
              <pre className="overflow-x-auto rounded-lg bg-stone-50 p-3 text-xs text-stone-700 ring-1 ring-stone-200">
                {text}
              </pre>
              <button type="button" className={buttonClass("secondary")} onClick={() => copyText(text, done)}>
                Copy {label.toLowerCase()}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
