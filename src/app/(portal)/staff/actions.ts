"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { escapeHtml, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { inviteUser } from "@/lib/invite";
import { NI_NUMBER_ERROR, normaliseNiNumber } from "@/lib/staff";
import { removeFile, storePdf } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

function employeeFields(formData: FormData) {
  const ni = text(formData, "ni_number");
  return {
    first_name: text(formData, "first_name") ?? "",
    last_name: text(formData, "last_name") ?? "",
    date_of_birth: text(formData, "date_of_birth"),
    address_line1: text(formData, "address_line1"),
    address_line2: text(formData, "address_line2"),
    town: text(formData, "town"),
    postcode: text(formData, "postcode")?.toUpperCase() ?? null,
    mobile_phone: text(formData, "mobile_phone"),
    home_phone: text(formData, "home_phone"),
    email: text(formData, "email")?.toLowerCase() ?? null,
    job_title: text(formData, "job_title"),
    employee_number: text(formData, "employee_number"),
    payroll_id: text(formData, "payroll_id"),
    start_date: text(formData, "start_date"),
    qualification_level: text(formData, "qualification_level"),
    leave_date: text(formData, "leave_date"),
    leave_reason: text(formData, "leave_reason"),
    ni_number: ni && (normaliseNiNumber(ni) ?? ni),
    emergency_contact_name: text(formData, "emergency_contact_name"),
    emergency_contact_relationship: text(formData, "emergency_contact_relationship"),
    emergency_contact_phone: text(formData, "emergency_contact_phone"),
  };
}

function checkEmployee(fields: ReturnType<typeof employeeFields>) {
  if (!fields.first_name || !fields.last_name) return { error: "First and last name are required." };
  if (fields.ni_number && !normaliseNiNumber(fields.ni_number)) return { error: NI_NUMBER_ERROR };
  if (fields.leave_date && !fields.leave_reason) return { error: "Add a leave reason as well as the leave date." };
  if (fields.leave_date && fields.start_date && fields.leave_date < fields.start_date) {
    return { error: "The leave date is before the start date." };
  }
  return null;
}

export async function createEmployee(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const fields = employeeFields(formData);
  const invalid = checkEmployee(fields);
  if (invalid) return invalid;

  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").insert(fields).select("id").single();
  if (error) return failed(error);

  // Every new employee starts with the standard onboarding checklist.
  const { data: templates } = await supabase
    .from("onboarding_task_templates")
    .select("title, sort_order")
    .eq("active", true);
  if (templates?.length) {
    await supabase.from("onboarding_tasks").insert(templates.map((t) => ({ ...t, employee_id: data.id })));
  }
  redirect(`/staff/${data.id}`);
}

export async function updateEmployee(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const fields = employeeFields(formData);
  const invalid = checkEmployee(fields);
  if (invalid) return invalid;

  const supabase = await createClient();
  const { error } = await supabase.from("employees").update(fields).eq("id", id);
  if (error) return failed(error);
  redirect(`/staff/${id}`);
}

export async function addQualification(employeeId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const name = text(formData, "name");
  if (!name) return { error: "Enter the qualification." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_qualifications")
    .insert({ employee_id: employeeId, name, achieved_on: text(formData, "achieved_on") });
  if (error) return failed(error);
  revalidatePath(`/staff/${employeeId}`);
  return { message: "Added." };
}

export async function removeQualification(employeeId: string, id: string) {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  await supabase.from("employee_qualifications").delete().eq("id", id);
  revalidatePath(`/staff/${employeeId}`);
}

export async function inviteEmployee(employeeId: string, _: ActionState): Promise<ActionState> {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("first_name, last_name, email, profile_id")
    .eq("id", employeeId)
    .single();
  if (!employee) return { error: "Employee not found." };
  if (employee.profile_id) return { error: "This employee already has a portal account." };
  if (!employee.email) return { error: "Add an email address to their record first." };

  const result = await inviteUser({
    email: employee.email,
    fullName: `${employee.first_name} ${employee.last_name}`,
    role: "staff",
    employeeId,
  });
  revalidatePath(`/staff/${employeeId}`);
  return result;
}

export async function sendContract(employeeId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const title = text(formData, "title");
  if (!title) return { error: "Give the contract a title." };

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("first_name, email, profile_id")
    .eq("id", employeeId)
    .single();
  if (!employee) return { error: "Employee not found." };

  const stored = await storePdf("contracts", employeeId, formData.get("file") as File | null);
  if ("error" in stored) return stored;

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      employee_id: employeeId,
      title,
      storage_path: stored.path,
      sha256: stored.sha256,
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_by: session.userId,
    })
    .select("id")
    .single();
  if (error) {
    await removeFile("contracts", stored.path);
    return failed(error);
  }
  revalidatePath(`/staff/${employeeId}`);

  if (!employee.profile_id || !employee.email) {
    return { message: "Contract saved. Invite them to the portal so they can sign it." };
  }
  const emailed = await sendEmail({
    to: [employee.email],
    subject: "Your contract is ready to sign",
    html: `<p>Hi ${escapeHtml(employee.first_name)},</p>
<p>Your contract "${escapeHtml(title)}" from Montagu Square Day Nursery is ready for you to read and sign.</p>
<p><a href="${env.appUrl()}/contracts/${contract.id}">Open your contract</a></p>`,
  });
  return { message: emailed ? "Contract sent by email." : "Contract saved. The email could not be sent, so let them know it's in the portal." };
}

export async function uploadSignedContract(employeeId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const title = text(formData, "title");
  if (!title) return { error: "Give the contract a title." };

  const stored = await storePdf("contracts", employeeId, formData.get("file") as File | null);
  if ("error" in stored) return stored;

  const supabase = await createClient();
  const { error } = await supabase.from("contracts").insert({
    employee_id: employeeId,
    title,
    storage_path: stored.path,
    sha256: stored.sha256,
    status: "signed",
    uploaded_signed: true,
    signed_at: text(formData, "signed_on") ?? new Date().toISOString(),
    sent_by: session.userId,
  });
  if (error) {
    await removeFile("contracts", stored.path);
    return failed(error);
  }
  revalidatePath(`/staff/${employeeId}`);
  return { message: "Signed contract stored." };
}

export async function voidContract(employeeId: string, contractId: string) {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  await supabase.from("contracts").update({ status: "void" }).eq("id", contractId).eq("status", "sent");
  revalidatePath(`/staff/${employeeId}`);
}

export async function setPolicyAcknowledged(employeeId: string, policyId: string, acknowledged: boolean): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const supabase = await createClient();
  const { error } = acknowledged
    ? await supabase
        .from("policy_acknowledgements")
        .upsert({ employee_id: employeeId, policy_id: policyId, recorded_by: session.userId })
    : await supabase.from("policy_acknowledgements").delete().eq("employee_id", employeeId).eq("policy_id", policyId);
  revalidatePath(`/staff/${employeeId}`);
  return failed(error);
}

export async function setTaskDone(employeeId: string, taskId: string, done: boolean): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const supabase = await createClient();
  const { error } = await supabase
    .from("onboarding_tasks")
    .update(done ? { completed_at: new Date().toISOString(), completed_by: session.userId } : { completed_at: null, completed_by: null })
    .eq("id", taskId);
  revalidatePath(`/staff/${employeeId}`);
  return failed(error);
}

export async function addTask(employeeId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const title = text(formData, "title");
  if (!title) return { error: "Enter the task." };

  const supabase = await createClient();
  const { error } = await supabase.from("onboarding_tasks").insert({ employee_id: employeeId, title, sort_order: 1000 });
  if (error) return failed(error);
  revalidatePath(`/staff/${employeeId}`);
  return { message: "Added." };
}

export async function removeTask(employeeId: string, taskId: string) {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  await supabase.from("onboarding_tasks").delete().eq("id", taskId);
  revalidatePath(`/staff/${employeeId}`);
}

export async function uploadP45(employeeId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin");
  const stored = await storePdf("p45s", employeeId, formData.get("file") as File | null);
  if ("error" in stored) return stored;

  const supabase = await createClient();
  const { data: previous } = await supabase.from("p45s").select("storage_path").eq("employee_id", employeeId).maybeSingle();
  const { error } = await supabase
    .from("p45s")
    .upsert(
      { employee_id: employeeId, storage_path: stored.path, uploaded_by: session.userId, uploaded_at: new Date().toISOString() },
      { onConflict: "employee_id" },
    );
  if (error) {
    await removeFile("p45s", stored.path);
    return failed(error);
  }
  if (previous) await removeFile("p45s", previous.storage_path);
  revalidatePath(`/staff/${employeeId}`);
  return { message: "P45 saved." };
}
