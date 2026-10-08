"use server";

import { redirect } from "next/navigation";
import { text, type ActionState } from "@/lib/action-state";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(formData, "email") ?? "",
    password: String(formData.get("password") ?? ""),
  });
  if (error?.code === "invalid_credentials") return { error: "Incorrect email or password." };
  if (error) {
    console.error(error);
    return { error: "Sign-in isn't working right now. Please try again later." };
  }
  redirect("/");
}

export async function sendPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = text(formData, "email");
  if (!email) return { error: "Enter your email address." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.appUrl()}/auth/confirm` });
  // Same message whether or not the account exists, so emails can't be probed.
  return { message: "If that email has an account, a reset link is on its way." };
}
