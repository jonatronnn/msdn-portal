import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { AuthShell } from "@/app/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { verifyCode } from "./actions";
import { Enroll } from "./enroll";

export default async function MfaPage({ searchParams }: PageProps<"/mfa">) {
  const next = (await searchParams).next === "set-password" ? "set-password" : "";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  if (data.claims.aal === "aal2") redirect(next ? "/auth/set-password" : "/");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];

  return (
    <AuthShell title="Two-step sign-in">
      {factor ? (
        <ActionForm action={verifyCode} submitLabel="Continue">
          <input type="hidden" name="factorId" value={factor.id} />
          <input type="hidden" name="next" value={next} />
          <Field label="Enter the 6-digit code from your authenticator app">
            <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" autoFocus required />
          </Field>
        </ActionForm>
      ) : (
        <Enroll />
      )}
      <a href="/auth/signout" className="mt-4 block text-sm text-stone-500 hover:underline">
        Sign out
      </a>
    </AuthShell>
  );
}
