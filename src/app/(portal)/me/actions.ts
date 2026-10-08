"use server";

import { redirect } from "next/navigation";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { NI_NUMBER_ERROR, normaliseNiNumber, QUALIFICATION_LEVELS } from "@/lib/staff";
import { removeFile, storePdf } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function submitStarterForm(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.employeeId) return { error: "Your account isn't linked to an employee record." };
  const required = [
    "date_of_birth",
    "address_line1",
    "town",
    "postcode",
    "mobile_phone",
    "email",
    "ni_number",
    "emergency_contact_name",
    "emergency_contact_relationship",
    "emergency_contact_phone",
  ];
  if (required.some((k) => !text(formData, k))) return { error: "Please fill in all the required fields." };
  const niNumber = normaliseNiNumber(text(formData, "ni_number")!);
  if (!niNumber) return { error: NI_NUMBER_ERROR };

  // The P45 is optional; store it first so a bad file is reported before anything is saved.
  const p45 = formData.get("p45") as File | null;
  const storedP45 = p45 && p45.size > 0 ? await storePdf("p45s", session.employeeId, p45) : null;
  if (storedP45 && "error" in storedP45) return storedP45;

  const level = text(formData, "qualification_level");
  const names = formData.getAll("qualification_name");
  const dates = formData.getAll("qualification_date");
  const others = names.map((name, i) => ({ name: String(name).trim(), achieved_on: String(dates[i] ?? "") }));

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_starter_form", {
    p_date_of_birth: text(formData, "date_of_birth")!,
    p_address_line1: text(formData, "address_line1")!,
    p_address_line2: text(formData, "address_line2") ?? "",
    p_town: text(formData, "town")!,
    p_postcode: text(formData, "postcode")!.toUpperCase(),
    p_mobile_phone: text(formData, "mobile_phone")!,
    p_home_phone: text(formData, "home_phone") ?? "",
    p_email: text(formData, "email")!.toLowerCase(),
    p_qualification_level: level && QUALIFICATION_LEVELS.includes(level) ? level : "Unqualified",
    p_other_qualifications: others.filter((q) => q.name),
    p_ni_number: niNumber,
    p_emergency_contact_name: text(formData, "emergency_contact_name")!,
    p_emergency_contact_relationship: text(formData, "emergency_contact_relationship")!,
    p_emergency_contact_phone: text(formData, "emergency_contact_phone")!,
  });
  if (error) {
    if (storedP45) await removeFile("p45s", storedP45.path);
    return failed(error);
  }

  if (storedP45) {
    const { error: p45Error } = await supabase
      .from("p45s")
      .insert({ employee_id: session.employeeId, storage_path: storedP45.path, uploaded_by: session.userId });
    if (p45Error) {
      await removeFile("p45s", storedP45.path);
      console.error(p45Error);
      return { error: "Your details were saved but the P45 wasn't. Please give a copy to the nursery office." };
    }
  }
  redirect("/me?submitted=1");
}
