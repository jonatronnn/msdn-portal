"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function childFields(formData: FormData) {
  return {
    first_name: text(formData, "first_name") ?? "",
    last_name: text(formData, "last_name") ?? "",
    provisional_start_date: text(formData, "provisional_start_date"),
  };
}

export async function createChild(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const fields = childFields(formData);
  if (!fields.first_name || !fields.last_name) return { error: "First and last name are required." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("children").insert(fields).select("id").single();
  if (error) return failed(error);

  // Every new child starts with the standard starter checklist.
  const { data: templates } = await supabase
    .from("child_checklist_templates")
    .select("title, sort_order")
    .eq("active", true);
  if (templates?.length) {
    await supabase.from("child_checklist_tasks").insert(templates.map((t) => ({ ...t, child_id: data.id })));
  }
  redirect(`/children/${data.id}`);
}

export async function updateChild(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const fields = childFields(formData);
  if (!fields.first_name || !fields.last_name) return { error: "First and last name are required." };

  const supabase = await createClient();
  const { error } = await supabase.from("children").update(fields).eq("id", id);
  if (error) return failed(error);
  revalidatePath(`/children/${id}`);
  return { message: "Saved." };
}

export async function deleteChild(id: string): Promise<ActionState> {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  const { error } = await supabase.from("children").delete().eq("id", id);
  if (error) return failed(error);
  redirect("/children");
}

export async function setChildTaskDone(childId: string, taskId: string, done: boolean): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const supabase = await createClient();
  const { error } = await supabase
    .from("child_checklist_tasks")
    .update(
      done
        ? { completed_at: new Date().toISOString(), completed_by: session.userId, completed_by_name: session.fullName || session.email }
        : { completed_at: null, completed_by: null, completed_by_name: null },
    )
    .eq("id", taskId);
  revalidatePath(`/children/${childId}`);
  return failed(error);
}

export async function saveChildTaskNotes(childId: string, taskId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  const { error } = await supabase.from("child_checklist_tasks").update({ notes: text(formData, "notes") }).eq("id", taskId);
  if (error) return failed(error);
  revalidatePath(`/children/${childId}`);
  return { message: "Saved." };
}

export async function addChildTask(childId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const title = text(formData, "title");
  if (!title) return { error: "Enter the step." };

  const supabase = await createClient();
  const { error } = await supabase.from("child_checklist_tasks").insert({ child_id: childId, title, sort_order: 1000 });
  if (error) return failed(error);
  revalidatePath(`/children/${childId}`);
  return { message: "Added." };
}

export async function removeChildTask(childId: string, taskId: string) {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  await supabase.from("child_checklist_tasks").delete().eq("id", taskId);
  revalidatePath(`/children/${childId}`);
}

export async function addChildTemplateTask(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const title = text(formData, "title");
  if (!title) return { error: "Enter the step." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("child_checklist_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("child_checklist_templates").insert({ title, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return failed(error);
  revalidatePath("/children");
  return { message: "Added. New children will get this step." };
}

export async function removeChildTemplateTask(id: string) {
  await requireSession("admin");
  const supabase = await createClient();
  await supabase.from("child_checklist_templates").delete().eq("id", id);
  revalidatePath("/children");
}
