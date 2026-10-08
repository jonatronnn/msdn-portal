"use server";

import { revalidatePath } from "next/cache";
import { failed, type ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin");
  const recipients = String(formData.get("recipients") ?? "")
    .split(/[\s,;]+/)
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  const invalid = recipients.find((r) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r));
  if (invalid) return { error: `“${invalid}” isn't a valid email address.` };

  const day = Number(formData.get("weekly_digest_day"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_settings")
    .update({
      birthdays_enabled: formData.get("birthdays_enabled") === "on",
      anniversaries_enabled: formData.get("anniversaries_enabled") === "on",
      weekly_digest_enabled: formData.get("weekly_digest_enabled") === "on",
      weekly_digest_day: Number.isInteger(day) && day >= 0 && day <= 6 ? day : 1,
      recipients,
    })
    .eq("id", 1);
  revalidatePath("/admin/settings");
  return failed(error) ?? { message: "Saved." };
}
