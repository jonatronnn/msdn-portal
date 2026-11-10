"use server";

import { revalidatePath } from "next/cache";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function months(formData: FormData) {
  const value = text(formData, "validity_months");
  return value ? Number(value) : null;
}

export async function addTrainingType(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const name = text(formData, "name");
  const validity = months(formData);
  if (!name) return { error: "Enter the training name." };
  if (validity != null && !(Number.isInteger(validity) && validity > 0)) return { error: "Months must be a whole number." };

  const supabase = await createClient();
  const { error } = await supabase.from("training_types").insert({ name, validity_months: validity });
  if (error) return failed(error);
  revalidatePath("/admin/settings");
  return { message: "Added." };
}

export async function setTrainingTypeActive(id: string, active: boolean) {
  await requireSession("admin");
  const supabase = await createClient();
  await supabase.from("training_types").update({ active }).eq("id", id);
  revalidatePath("/admin/settings");
}

export async function addChecklistStep(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const title = text(formData, "title");
  if (!title) return { error: "Enter the step." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("onboarding_task_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("onboarding_task_templates").insert({ title, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return failed(error);
  revalidatePath("/admin/settings");
  return { message: "Added. New starters will get this step." };
}

export async function removeChecklistStep(id: string) {
  await requireSession("admin");
  const supabase = await createClient();
  await supabase.from("onboarding_task_templates").update({ active: false }).eq("id", id);
  revalidatePath("/admin/settings");
}
