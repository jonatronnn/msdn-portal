"use server";

import { revalidatePath } from "next/cache";
import { failed, type ActionState } from "@/lib/action-state";
import { actorName, requireSession } from "@/lib/auth";
import { PAY_RATE_KEYS } from "@/lib/pay";
import { createClient } from "@/lib/supabase/server";

export async function savePayRates(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin");
  const supabase = await createClient();
  const { data: current } = await supabase.from("pay_rates").select("key, rate");
  const changed: { key: string; rate: number }[] = [];
  for (const { key, label } of PAY_RATE_KEYS) {
    const value = String(formData.get(key) ?? "").replace(/[£\s]/g, "");
    const rate = Number(value);
    if (!value || !Number.isFinite(rate) || rate < 0) return { error: `Enter a rate for ${label}.` };
    if (Number(current?.find((r) => r.key === key)?.rate) !== rate) changed.push({ key, rate });
  }
  const now = new Date().toISOString();
  for (const { key, rate } of changed) {
    const { error } = await supabase
      .from("pay_rates")
      .update({ rate, updated_at: now, updated_by_name: actorName(session) })
      .eq("key", key);
    if (error) return failed(error);
  }
  revalidatePath("/admin/pay-rates");
  return { message: changed.length ? "Pay rates saved." : "Nothing changed." };
}
