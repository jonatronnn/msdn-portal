"use server";

import { revalidatePath } from "next/cache";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession, type Role } from "@/lib/auth";
import { inviteUser } from "@/lib/invite";
import { createAdminClient } from "@/lib/supabase/admin";

const roles: Role[] = ["admin", "manager", "staff"];

// Profile changes use the service role: the database has no update rules for
// profiles, so nobody can change a role except through these admin checks.

export async function inviteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const email = text(formData, "email")?.toLowerCase();
  const fullName = text(formData, "full_name");
  const role = text(formData, "role") as Role;
  if (!email || !fullName) return { error: "Enter their name and email." };
  if (!roles.includes(role)) return { error: "Choose a role." };

  const result = await inviteUser({ email, fullName, role, employeeId: text(formData, "employee_id") });
  revalidatePath("/admin/users");
  return result;
}

export async function changeRole(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin");
  if (userId === session.userId) return { error: "You can't change your own role." };
  const role = text(formData, "role") as Role;
  if (!roles.includes(role)) return { error: "Choose a role." };

  const { error } = await createAdminClient().from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/users");
  return failed(error) ?? { message: "Saved." };
}

export async function linkEmployee(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const employeeId = text(formData, "employee_id");
  const admin = createAdminClient();
  const { error: unlinkError } = await admin.from("employees").update({ profile_id: null }).eq("profile_id", userId);
  if (unlinkError) return failed(unlinkError);
  if (employeeId) {
    const { error } = await admin.from("employees").update({ profile_id: userId }).eq("id", employeeId);
    if (error) return failed(error);
  }
  revalidatePath("/admin/users");
  return { message: "Saved." };
}

export async function setActive(userId: string, active: boolean) {
  const session = await requireSession("admin");
  if (userId === session.userId) return;
  const admin = createAdminClient();
  // Banning also ends their current sessions at the next token refresh.
  await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  await admin.from("profiles").update({ active }).eq("id", userId);
  revalidatePath("/admin/users");
}

// For someone who has lost their phone: they'll set up two-step sign-in again
// the next time they log in.
export async function resetMfa(userId: string, _: ActionState): Promise<ActionState> {
  await requireSession("admin");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) return failed(error);
  for (const factor of data.factors) {
    await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
  }
  return { message: "Two-step sign-in reset." };
}
