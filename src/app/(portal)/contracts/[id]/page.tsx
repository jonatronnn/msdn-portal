import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signContract } from "./actions";

export default async function ContractPage({ params }: PageProps<"/contracts/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("contracts").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const mine = c.employee_id === session.employeeId;

  return (
    <>
      <PageHeader title={c.title}>
        <LinkButton href={`/files/contracts/${c.id}`} target="_blank">
          Open PDF
        </LinkButton>
      </PageHeader>
      <Card>
        {c.status === "signed" ? (
          <p className="text-sm">
            {c.uploaded_signed
              ? "A signed copy of this contract is on file."
              : `Signed by ${c.signed_name} on ${new Date(c.signed_at!).toLocaleString("en-GB", { timeZone: "Europe/London" })}.`}
          </p>
        ) : c.status === "void" ? (
          <p className="text-sm">This contract has been withdrawn.</p>
        ) : mine ? (
          <ActionForm action={signContract.bind(null, c.id)} submitLabel="Sign contract">
            <p className="text-sm text-stone-700">
              Please open and read the contract PDF before signing. Typing your name below and selecting “Sign contract”
              counts as your signature. We record the date, time and your device&apos;s IP address with it.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 accent-teal-700" />I have read this
              contract and agree to its terms.
            </label>
            <Field label="Your full name">
              <Input name="signed_name" autoComplete="name" required />
            </Field>
          </ActionForm>
        ) : (
          <p className="text-sm">Waiting for the employee to sign.</p>
        )}
      </Card>
    </>
  );
}
