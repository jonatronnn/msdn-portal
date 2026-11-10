import "server-only";
import { hashToken } from "@/lib/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";

// The starter-form link for this token, if it can still be used. Uses the
// service role because the starter isn't signed in; the token is the check.
export async function findUsableLink(token: string) {
  const { data } = await createAdminClient()
    .from("starter_form_links")
    .select("id, employee_id, used_at, revoked_at, expires_at, employees(first_name, last_name, leave_date)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data || data.used_at || data.revoked_at || data.expires_at <= new Date().toISOString() || !data.employees) return null;
  return data;
}
