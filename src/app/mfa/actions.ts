"use server";

import { redirect } from "next/navigation";
import { text, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

export type Enrollment = { factorId: string; qrCode: string; secret: string } | { error: string };

export async function startEnrollment(): Promise<Enrollment> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  // Clear out any half-finished setup before starting again.
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error || !data) return { error: "Couldn't start set-up. Please try again." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyCode(_: ActionState, formData: FormData): Promise<ActionState> {
  const factorId = text(formData, "factorId");
  const code = text(formData, "code")?.replace(/\s/g, "");
  if (!factorId || !code) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "That code didn't work. Check your app and try again." };
  redirect(formData.get("next") === "set-password" ? "/auth/set-password" : "/");
}
