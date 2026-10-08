"use server";

import { revalidatePath } from "next/cache";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addTemplateTask(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const title = text(formData, "title");
  if (!title) return { error: "Enter the task." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("onboarding_task_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("onboarding_task_templates").insert({ title, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return failed(error);
  revalidatePath("/onboarding");
  return { message: "Added. New employees will get this task." };
}

export async function removeTemplateTask(id: string) {
  await requireSession("admin");
  const supabase = await createClient();
  await supabase.from("onboarding_task_templates").delete().eq("id", id);
  revalidatePath("/onboarding");
}
