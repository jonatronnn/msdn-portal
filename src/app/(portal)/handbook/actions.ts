"use server";

import { revalidatePath } from "next/cache";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { removeFile, storePdf } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function addPolicy(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const title = text(formData, "title");
  if (!title) return { error: "Give the policy a title." };

  const stored = await storePdf("policies", "policies", formData.get("file") as File | null);
  if ("error" in stored) return stored;

  const supabase = await createClient();
  const { error } = await supabase.from("policies").insert({
    title,
    description: text(formData, "description"),
    storage_path: stored.path,
    requires_acknowledgement: formData.get("requires_acknowledgement") === "on",
  });
  if (error) {
    await removeFile("policies", stored.path);
    return failed(error);
  }
  revalidatePath("/handbook");
  return { message: "Policy published." };
}

export async function setPolicyArchived(id: string, archived: boolean) {
  await requireSession("admin");
  const supabase = await createClient();
  await supabase.from("policies").update({ archived }).eq("id", id);
  revalidatePath("/handbook");
}

export async function acknowledgePolicy(policyId: string, _: ActionState): Promise<ActionState> {
  const session = await requireSession();
  if (!session.employeeId) return { error: "Your account isn't linked to an employee record." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("policy_acknowledgements")
    .insert({ policy_id: policyId, employee_id: session.employeeId, recorded_by: session.userId });
  if (error && error.code !== "23505") return failed(error);
  revalidatePath("/handbook");
  return { message: "Thank you." };
}
