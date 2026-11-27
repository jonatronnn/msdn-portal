import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { SignatureGenerator } from "./signature-generator";

const setup: [string, string][] = [
  ["New Outlook and Outlook on the web", "Settings, then Accounts, then Signatures. Choose New signature, paste, Save, then pick it under Default signatures."],
  ["Classic Outlook", "File, then Options, then Mail, then Signatures. Choose New, paste, and set it for new messages and replies."],
  ["Outlook for Mac", "Outlook menu, then Settings, then Signatures. Press +, paste, close to save, and set it as the default."],
  ["Gmail", "Settings, then See all settings. Under Signature choose Create new, paste, set the defaults and press Save Changes."],
  ["Apple Mail", "Mail menu, then Settings, then Signatures. Pick the account, press +, paste, and untick \"Always match my default message font\"."],
  ["iPhone and Android", "Use the short phone version: iPhone Settings, then Apps, then Mail, then Signature; Gmail app settings, then your account, then Mobile signature."],
];

export default async function SignaturePage() {
  const session = await requireSession("admin", "manager");

  return (
    <>
      <PageHeader title="Email signature" />
      <SignatureGenerator defaultName={session.fullName} />
      <Card title="Adding it to your email">
        <p className="mb-4 text-sm text-stone-600">
          Press Copy signature, then paste it into your email app. Sign off (&ldquo;Kind regards,&rdquo;) above the
          signature as usual, not inside it.
        </p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {setup.map(([app, steps]) => (
            <div key={app}>
              <dt className="font-medium text-stone-800">{app}</dt>
              <dd className="text-stone-600">{steps}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
