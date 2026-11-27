"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { failed, text, type ActionState } from "@/lib/action-state";
import { actorName, requireSession } from "@/lib/auth";
import { encryptJson } from "@/lib/crypto";
import { addMonths, todayInLondon } from "@/lib/dates";
import { env } from "@/lib/env";
import {
  assignFamlyQualification,
  createFamlyEmployee,
  getFamlyEmployee,
  listFamlyEmployees,
  listFamlyQualificationTypes,
  listFamlyRooms,
  updateFamlyEmployee,
} from "@/lib/famly";
import { changesFromFamly, currentQualification, type FamlyQualification, fromFamly, toFamly } from "@/lib/famly-mapping";
import { checkRecordAutomations, completeAutomation, sendStarterForm } from "@/lib/onboarding";
import {
  CONTRACT_TYPES,
  GENDERS,
  medicalFields,
  NI_NUMBER_ERROR,
  normaliseIdNumber,
  normaliseAccountNumber,
  normaliseNiNumber,
  normaliseSortCode,
  QUALIFICATION_LEVELS,
} from "@/lib/staff";
import { removeFile, storePdf } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { refreshOpenMonthsFor } from "@/lib/wages-server";

function number(formData: FormData, key: string) {
  const value = text(formData, key)?.replace(/[£,\s]/g, "");
  return value ? Number(value) : null;
}

// Fields managers enter (M), plus the payroll reference (O).
function employmentFields(formData: FormData) {
  return {
    first_name: text(formData, "first_name") ?? "",
    middle_name: text(formData, "middle_name"),
    last_name: text(formData, "last_name") ?? "",
    email: text(formData, "email")?.toLowerCase() ?? "",
    job_title: text(formData, "job_title"),
    start_date: text(formData, "start_date"),
    contract_type: text(formData, "contract_type"),
    contract_end_date: text(formData, "contract_end_date"),
    notice_period: text(formData, "notice_period"),
    probation_end_date: text(formData, "probation_end_date"),
    working_pattern: text(formData, "working_pattern"),
    contracted_hours: number(formData, "contracted_hours"),
    pay_rate: number(formData, "pay_rate"),
    pay_rate_basis: text(formData, "pay_rate_basis"),
    qualification_level: text(formData, "qualification_level"),
    qualification_date: text(formData, "qualification_date"),
    payroll_id: text(formData, "payroll_id"),
  };
}

// Fields the starter normally gives on the Important information form (S).
function personalFields(formData: FormData) {
  const ni = text(formData, "ni_number");
  return {
    date_of_birth: text(formData, "date_of_birth"),
    gender: text(formData, "gender"),
    nickname: text(formData, "nickname"),
    nationality: text(formData, "nationality"),
    place_of_birth: text(formData, "place_of_birth"),
    mobile_phone: text(formData, "mobile_phone"),
    home_phone: text(formData, "home_phone"),
    address_line1: text(formData, "address_line1"),
    address_line2: text(formData, "address_line2"),
    town: text(formData, "town"),
    postcode: text(formData, "postcode")?.toUpperCase() ?? null,
    emergency_contact_name: text(formData, "emergency_contact_name"),
    emergency_contact_relationship: text(formData, "emergency_contact_relationship"),
    emergency_contact_phone: text(formData, "emergency_contact_phone"),
    emergency_contact_address: text(formData, "emergency_contact_address"),
    ni_number: ni && (normaliseNiNumber(ni) ?? ni),
    special_notes: text(formData, "special_notes"),
  };
}

function checkEmployment(f: ReturnType<typeof employmentFields>) {
  if (!f.first_name || !f.last_name) return { error: "First and last name are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return { error: "Enter a valid email address." };
  if (f.contract_type && !CONTRACT_TYPES.includes(f.contract_type)) return { error: "Choose a contract type." };
  if (f.qualification_level && !QUALIFICATION_LEVELS.includes(f.qualification_level)) return { error: "Choose a qualification level." };
  if (f.pay_rate_basis && !["hourly", "annual"].includes(f.pay_rate_basis)) return { error: "Choose hourly or annual pay." };
  for (const [key, label] of [
    ["contracted_hours", "Contracted hours"],
    ["pay_rate", "Pay rate"],
  ] as const) {
    const value = f[key];
    if (value != null && !(Number.isFinite(value) && value > 0)) return { error: `${label} must be a number above 0.` };
  }
  return null;
}

function checkPersonal(f: ReturnType<typeof personalFields>) {
  if (f.ni_number && !normaliseNiNumber(f.ni_number)) return { error: NI_NUMBER_ERROR };
  if (f.gender && !GENDERS.includes(f.gender)) return { error: "Choose a gender." };
  return null;
}

async function addChecklist(supabase: Awaited<ReturnType<typeof createClient>>, employeeId: string, by: string) {
  const { data: templates } = await supabase
    .from("onboarding_task_templates")
    .select("title, automation, sort_order")
    .eq("active", true);
  if (templates?.length) {
    await supabase.from("onboarding_tasks").insert(templates.map((t) => ({ ...t, employee_id: employeeId })));
  }
  await checkRecordAutomations(supabase, employeeId, by);
}

async function createEmployee(
  formData: FormData,
  fields: Partial<ReturnType<typeof employmentFields>> & { first_name: string; last_name: string; email: string },
  withChecklist: boolean,
): Promise<ActionState> {
  const session = await requireSession();
  const by = actorName(session);
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").insert(fields).select("id, first_name, email").single();
  if (error) return failed(error);

  if (withChecklist) await addChecklist(supabase, data.id, by);

  if (formData.get("send_form") === "on") {
    const sent = await sendStarterForm(supabase, data, by);
    if ("link" in sent && sent.link) {
      // Email isn't working: stay here so the manager can copy the link.
      return { message: `${fields.first_name}'s record was created. ${sent.message}`, link: sent.link };
    }
  }
  redirect(`/staff/${data.id}`);
}

// Adding someone who already works at the nursery: no onboarding checklist.
export async function addExistingEmployee(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const fields = employmentFields(formData);
  const invalid = checkEmployment(fields);
  if (invalid) return invalid;
  if (!fields.job_title || !fields.start_date) return { error: "Job title and start date are required." };
  return createEmployee(formData, fields, false);
}

// A new starter: just the basics, then the onboarding checklist takes over.
export async function addNewStarter(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const fields = {
    first_name: text(formData, "first_name") ?? "",
    last_name: text(formData, "last_name") ?? "",
    email: text(formData, "email")?.toLowerCase() ?? "",
    job_title: text(formData, "job_title"),
    start_date: text(formData, "start_date"),
  };
  const invalid = checkEmployment({ ...employmentFields(new FormData()), ...fields });
  if (invalid) return invalid;
  return createEmployee(formData, fields, true);
}

export async function updateEmployee(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const employment = employmentFields(formData);
  const personal = personalFields(formData);
  const invalid = checkEmployment(employment) ?? checkPersonal(personal);
  if (invalid) return invalid;

  const supabase = await createClient();
  const { error } = await supabase.from("employees").update({ ...employment, ...personal }).eq("id", id);
  if (error) return failed(error);
  const { error: medicalError } = await supabase
    .from("employee_medical")
    .upsert({ employee_id: id, ...medicalFields(formData), updated_at: new Date().toISOString(), updated_by_name: actorName(session) });
  if (medicalError) return failed(medicalError);
  await checkRecordAutomations(supabase, id, actorName(session));
  await refreshOpenMonthsFor(supabase, id, actorName(session));
  redirect(`/staff/${id}`);
}

export async function endEmployment(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const leaveDate = text(formData, "leave_date");
  const leaveReason = text(formData, "leave_reason");
  if (!leaveDate || !leaveReason) return { error: "Enter the leave date and reason." };

  const supabase = await createClient();
  const { data: e } = await supabase.from("employees").select("start_date").eq("id", id).single();
  if (e?.start_date && leaveDate < e.start_date) return { error: "The leave date is before the start date." };
  const { error } = await supabase.from("employees").update({ leave_date: leaveDate, leave_reason: leaveReason }).eq("id", id);
  if (error) return failed(error);
  await refreshOpenMonthsFor(supabase, id, actorName(session));
  revalidatePath(`/staff/${id}`);
  return { message: "Employment ended." };
}

export async function reinstateEmployee(id: string) {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase.from("employees").update({ leave_date: null, leave_reason: null }).eq("id", id);
  await refreshOpenMonthsFor(supabase, id, actorName(session));
  revalidatePath(`/staff/${id}`);
}

export async function sendStarterFormAction(id: string, _: ActionState): Promise<ActionState> {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: e } = await supabase.from("employees").select("id, first_name, email").eq("id", id).single();
  if (!e) return { error: "Employee not found." };
  const result = await sendStarterForm(supabase, e, actorName(session));
  revalidatePath(`/staff/${id}`);
  return result;
}

export async function saveBankDetails(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin");
  const accountName = text(formData, "account_name");
  const sortCode = normaliseSortCode(text(formData, "sort_code") ?? "");
  const accountNumber = normaliseAccountNumber(text(formData, "account_number") ?? "");
  if (!accountName) return { error: "Enter the name on the account." };
  if (!sortCode) return { error: "The sort code should be 6 digits." };
  if (!accountNumber) return { error: "The account number should be 8 digits." };

  const supabase = await createClient();
  const { error } = await supabase.from("employee_bank_details").upsert({
    employee_id: id,
    encrypted: encryptJson({ accountName, sortCode, accountNumber }, env.bankDetailsKey()),
    updated_at: new Date().toISOString(),
    updated_by_name: actorName(session),
  });
  if (error) return failed(error);
  await supabase.from("employees").update({ bank_details_received_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/staff/${id}`);
  return { message: "Bank details saved." };
}

export async function saveIdNumbers(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const passportNumber = normaliseIdNumber(text(formData, "passport_number"));
  const drivingLicenceNumber = normaliseIdNumber(text(formData, "driving_licence_number"));
  if (!passportNumber && !drivingLicenceNumber) return { error: "Enter a passport or driving licence number." };

  const supabase = await createClient();
  const { error } = await supabase.from("employee_id_numbers").upsert({
    employee_id: id,
    encrypted: encryptJson({ passportNumber, drivingLicenceNumber }, env.bankDetailsKey()),
    updated_at: new Date().toISOString(),
    updated_by_name: actorName(session),
  });
  if (error) return failed(error);
  revalidatePath(`/staff/${id}`);
  return { message: "ID numbers saved." };
}

export async function addTraining(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const typeId = text(formData, "training_type_id");
  const completedOn = text(formData, "completed_on");
  let expiresOn = text(formData, "expires_on");
  if (!typeId) return { error: "Choose the training." };

  const supabase = await createClient();
  if (!expiresOn && completedOn) {
    // Fill in the expiry from how long this kind of certificate lasts.
    const { data: type } = await supabase.from("training_types").select("validity_months").eq("id", typeId).single();
    if (type?.validity_months) expiresOn = addMonths(completedOn, type.validity_months);
  }
  const { error } = await supabase.from("employee_training").insert({
    employee_id: id,
    training_type_id: typeId,
    completed_on: completedOn,
    expires_on: expiresOn,
    recorded_by_name: actorName(session),
  });
  if (error) return failed(error);
  revalidatePath(`/staff/${id}`);
  return { message: "Training added." };
}

export async function removeTraining(id: string, trainingId: string) {
  await requireSession();
  const supabase = await createClient();
  await supabase.from("employee_training").delete().eq("id", trainingId);
  revalidatePath(`/staff/${id}`);
}

export async function uploadContract(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const title = text(formData, "title");
  if (!title) return { error: "Give the contract a title." };

  const stored = await storePdf("contracts", id, formData.get("file") as File | null);
  if ("error" in stored) return stored;

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .insert({ employee_id: id, title, storage_path: stored.path, uploaded_by_name: actorName(session) });
  if (error) {
    await removeFile("contracts", stored.path);
    return failed(error);
  }
  await completeAutomation(supabase, id, "contract_uploaded", actorName(session));
  revalidatePath(`/staff/${id}`);
  return { message: "Contract uploaded." };
}

export async function removeContract(id: string, contractId: string) {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("contracts").delete().eq("id", contractId).select("storage_path").maybeSingle();
  if (data) await removeFile("contracts", data.storage_path);
  revalidatePath(`/staff/${id}`);
}

export async function setTaskDone(id: string, taskId: string, done: boolean): Promise<ActionState> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("onboarding_tasks")
    .update(
      done
        ? { completed_at: new Date().toISOString(), completed_by: session.userId, completed_by_name: actorName(session) }
        : { completed_at: null, completed_by: null, completed_by_name: null },
    )
    .eq("id", taskId);
  revalidatePath(`/staff/${id}`);
  return failed(error);
}

export async function addTask(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const title = text(formData, "title");
  if (!title) return { error: "Enter the task." };

  const supabase = await createClient();
  const { error } = await supabase.from("onboarding_tasks").insert({ employee_id: id, title, sort_order: 1000 });
  if (error) return failed(error);
  revalidatePath(`/staff/${id}`);
  return { message: "Added." };
}

export async function removeTask(id: string, taskId: string) {
  await requireSession();
  const supabase = await createClient();
  await supabase.from("onboarding_tasks").delete().eq("id", taskId);
  revalidatePath(`/staff/${id}`);
}

type QualificationDetails = { qualification_level: string | null; qualification_date: string | null };

// Sends their portal qualification level to Famly if it differs from what
// Famly shows. Returns a note when Famly has no type of that name.
async function sendQualification(famlyId: string, siteId: string, e: QualificationDetails, current: FamlyQualification[]) {
  if (!e.qualification_level) return "";
  const today = todayInLondon();
  const q = currentQualification(current, today);
  const from = e.qualification_date ?? today;
  if (q?.qualificationType.name === e.qualification_level && (!e.qualification_date || q.validFrom === from)) return "";
  const type = (await listFamlyQualificationTypes(siteId)).find(
    (t) => t.name.trim().toLowerCase() === e.qualification_level!.toLowerCase(),
  );
  if (!type) return ` Famly has no qualification called "${e.qualification_level}", so that wasn't sent.`;
  await assignFamlyQualification(famlyId, type.qualificationTypeId, from);
  return "";
}

export async function addToFamly(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: e } = await supabase.from("employees").select("*").eq("id", id).single();
  if (!e) return { error: "Employee not found." };
  if (e.famly_id) return { error: "Already in Famly." };
  if (!e.start_date) return { error: "Add their start date first: Famly needs it." };

  let famlyId: string;
  let room;
  try {
    room = (await listFamlyRooms()).find((r) => r.id === formData.get("room_id"));
    if (!room) return { error: "Choose their room." };
    famlyId = await createFamlyEmployee(toFamly(e), room);
  } catch {
    return { error: "Couldn't add them to Famly. Please try again." };
  }
  await supabase
    .from("employees")
    .update({ famly_id: famlyId, famly_group_id: room.id, famly_synced_at: new Date().toISOString() })
    .eq("id", id);
  await completeAutomation(supabase, id, "famly", actorName(session));
  revalidatePath(`/staff/${id}`);
  try {
    return { message: `Added to Famly.${await sendQualification(famlyId, room.institutionId, e, [])}` };
  } catch {
    return { message: "Added to Famly, but their qualification couldn't be sent. Try Send changes to Famly." };
  }
}

export async function sendChangesToFamly(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const supabase = await createClient();
  const { data: e } = await supabase.from("employees").select("*").eq("id", id).single();
  if (!e?.famly_id) return { error: "They aren't linked to Famly yet." };
  const roomId = text(formData, "room_id");

  let note: string;
  try {
    await updateFamlyEmployee(e.famly_id, toFamly(e), roomId !== e.famly_group_id ? roomId : null);
    const f = await getFamlyEmployee(e.famly_id);
    note = f ? await sendQualification(e.famly_id, f.siteId, e, f.qualificationTypeAssignments) : "";
  } catch {
    return { error: "Couldn't update Famly. Please try again." };
  }
  await supabase
    .from("employees")
    .update({ famly_group_id: roomId ?? e.famly_group_id, famly_synced_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/staff/${id}`);
  return { message: `Famly updated.${note}` };
}

// Copies their current Famly details over the portal record. Anything blank
// in Famly is left as it is in the portal.
export async function getChangesFromFamly(id: string, _: ActionState): Promise<ActionState> {
  await requireSession();
  const supabase = await createClient();
  const { data: e } = await supabase.from("employees").select("famly_id").eq("id", id).single();
  if (!e?.famly_id) return { error: "They aren't linked to Famly yet." };

  let f;
  try {
    f = await getFamlyEmployee(e.famly_id);
  } catch {
    return { error: "Couldn't reach Famly. Please try again." };
  }
  if (!f) return { error: "They're no longer in Famly." };

  const { error } = await supabase
    .from("employees")
    .update({ ...changesFromFamly(f, todayInLondon()), famly_synced_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return failed(error);
  revalidatePath(`/staff/${id}`);
  return { message: "Updated from Famly." };
}

// Brings the chosen Famly staff into the portal. Anyone already here with the
// same email is linked to their existing record rather than duplicated.
export async function importFromFamly(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const by = actorName(session);
  const chosen = new Set(formData.getAll("famly_ids").map(String));
  if (!chosen.size) return { error: "Tick the people to import." };
  const withChecklist = formData.get("new_starters") === "on";

  let famlyStaff;
  try {
    famlyStaff = (await listFamlyEmployees()).filter((f) => chosen.has(f.id));
  } catch {
    return { error: "Couldn't reach Famly. Please try again." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("employees").select("id, email, famly_id");
  const today = todayInLondon();
  let imported = 0;
  let linked = 0;
  const skipped: string[] = [];
  for (const f of famlyStaff) {
    const fields = fromFamly(f, today);
    if (existing?.some((e) => e.famly_id === f.id)) continue;
    if (!fields.email) {
      skipped.push(`${fields.first_name} (no email in Famly)`);
      continue;
    }
    const match = existing?.find((e) => !e.famly_id && e.email === fields.email);
    let employeeId: string;
    if (match) {
      const { error } = await supabase
        .from("employees")
        .update({ famly_id: f.id, famly_group_id: f.groupId, famly_synced_at: new Date().toISOString() })
        .eq("id", match.id);
      if (error) {
        skipped.push(fields.first_name);
        continue;
      }
      employeeId = match.id;
      linked++;
    } else {
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...fields, famly_synced_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error || !data) {
        console.error(error);
        skipped.push(fields.first_name);
        continue;
      }
      employeeId = data.id;
      if (withChecklist) await addChecklist(supabase, employeeId, by);
      imported++;
    }
    await completeAutomation(supabase, employeeId, "famly", by);
  }

  revalidatePath("/staff");
  const parts = [`Imported ${imported}`, linked ? `linked ${linked} already in the portal` : ""].filter(Boolean);
  return {
    message: `${parts.join(", ")}.${skipped.length ? ` Not imported: ${skipped.join(", ")}.` : ""}`,
  };
}
