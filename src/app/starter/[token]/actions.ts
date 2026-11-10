"use server";

import { redirect } from "next/navigation";
import { text, type ActionState } from "@/lib/action-state";
import { encryptJson } from "@/lib/crypto";
import { env } from "@/lib/env";
import { completeAutomation } from "@/lib/onboarding";
import { NI_NUMBER_ERROR, normaliseAccountNumber, normaliseNiNumber, normaliseSortCode } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { findUsableLink } from "../link";

const REQUIRED = [
  "date_of_birth",
  "mobile_phone",
  "address_line1",
  "town",
  "postcode",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "ni_number",
  "account_name",
  "sort_code",
  "account_number",
];

export async function submitStarterForm(token: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const link = await findUsableLink(token);
  if (!link?.employees) return { error: "This link has expired or has already been used. Please contact the nursery office." };

  if (REQUIRED.some((k) => !text(formData, k))) return { error: "Please fill in all the fields marked *." };
  const niNumber = normaliseNiNumber(text(formData, "ni_number")!);
  if (!niNumber) return { error: NI_NUMBER_ERROR };
  const sortCode = normaliseSortCode(text(formData, "sort_code")!);
  if (!sortCode) return { error: "The sort code should be 6 digits, like 12-34-56." };
  const accountNumber = normaliseAccountNumber(text(formData, "account_number")!);
  if (!accountNumber) return { error: "The account number should be 8 digits." };
  const dob = text(formData, "date_of_birth")!;
  if (dob > new Date().toISOString().slice(0, 10)) return { error: "Check your date of birth." };

  const db = createAdminClient();
  const name = `${link.employees.first_name} ${link.employees.last_name}`;
  const now = new Date().toISOString();

  // Claim the link first so it can't be submitted twice.
  const { data: claimed } = await db
    .from("starter_form_links")
    .update({ used_at: now })
    .eq("id", link.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return { error: "This link has already been used." };

  const { error } = await db
    .from("employees")
    .update({
      date_of_birth: dob,
      mobile_phone: text(formData, "mobile_phone"),
      address_line1: text(formData, "address_line1"),
      address_line2: text(formData, "address_line2"),
      town: text(formData, "town"),
      postcode: text(formData, "postcode")!.toUpperCase(),
      emergency_contact_name: text(formData, "emergency_contact_name"),
      emergency_contact_relationship: text(formData, "emergency_contact_relationship"),
      emergency_contact_phone: text(formData, "emergency_contact_phone"),
      ni_number: niNumber,
      info_form_submitted_at: now,
      bank_details_received_at: now,
    })
    .eq("id", link.employee_id);
  const { error: bankError } = error
    ? { error }
    : await db.from("employee_bank_details").upsert({
        employee_id: link.employee_id,
        encrypted: encryptJson({ accountName: text(formData, "account_name")!, sortCode, accountNumber }, env.bankDetailsKey()),
        updated_at: now,
        updated_by_name: `${name} (form)`,
      });
  if (error || bankError) {
    console.error(error ?? bankError);
    await db.from("starter_form_links").update({ used_at: null }).eq("id", link.id);
    return { error: "Something went wrong saving your details. Please try again." };
  }

  await completeAutomation(db, link.employee_id, "form_returned", `${name} (form)`);
  redirect("/starter/thanks");
}
