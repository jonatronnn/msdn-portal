import "server-only";
import type { Role } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Creates a portal account and emails the person a link to set their password.
// Callers must check the inviter is allowed to grant `role`.
export async function inviteUser({
  email,
  fullName,
  role,
  employeeId,
}: {
  email: string;
  fullName: string;
  role: Role;
  employeeId: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) {
    if (error?.code === "email_exists") return { error: "An account with this email already exists." };
    console.error(error);
    return { error: "Couldn't send the invitation. Please try again." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ role, full_name: fullName, active: true })
    .eq("id", data.user.id);
  if (profileError) {
    console.error(profileError);
    return { error: "The invitation was sent but the account couldn't be set up. Please contact support." };
  }

  if (employeeId) {
    const { error: linkError } = await admin.from("employees").update({ profile_id: data.user.id }).eq("id", employeeId);
    if (linkError) console.error(linkError);
  }
  return { message: `Invitation sent to ${email}.` };
}
