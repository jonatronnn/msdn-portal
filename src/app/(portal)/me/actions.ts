"use server";

import { redirect } from "next/navigation";
import { failed, text, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { QUALIFICATION_LEVELS } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export async function submitStarterForm(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const required = ["date_of_birth", "address_line1", "town", "postcode", "mobile_phone", "email"];
  if (required.some((k) => !text(formData, k))) return { error: "Please fill in all the required fields." };

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
  });
  if (error) return failed(error);
  redirect("/me?submitted=1");
}
