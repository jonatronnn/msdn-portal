import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { AuthShell } from "@/app/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { setPassword } from "./actions";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?error=link");

  // Supabase only lets someone with two-step sign-in change their password
  // after they've entered a code, so send them to do that first.
  if (data.claims.aal !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.totp.length) redirect("/mfa?next=set-password");
  }

  return (
    <AuthShell title="Choose a password">
      <ActionForm action={setPassword} submitLabel="Save password">
        <Field label="New password" hint="At least 10 characters, with letters and numbers.">
          <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirm password">
          <Input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
      </ActionForm>
    </AuthShell>
  );
}
