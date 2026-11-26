"use server";

import { revalidatePath } from "next/cache";
import { failed, text, type ActionState } from "@/lib/action-state";
import { actorName, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { paidMinutes, WEEKDAYS } from "@/lib/wages";
import { refreshOpenMonthsFor } from "@/lib/wages-server";

function patternDays(formData: FormData, weeks: ("A" | "B")[]) {
  const days = [];
  for (const week of weeks) {
    for (let weekday = 1; weekday <= 7; weekday++) {
      const prefix = `${week}${weekday}`;
      if (!formData.get(`${prefix}_works`)) continue;
      const label = `${weeks.length > 1 ? `Week ${week} ` : ""}${WEEKDAYS[weekday - 1]}`;
      const starts_at = text(formData, `${prefix}_start`);
      const ends_at = text(formData, `${prefix}_end`);
      if (!starts_at || !ends_at) return { error: `${label}: enter the start and finish times.` };
      if (ends_at <= starts_at) return { error: `${label}: the finish time must be after the start time.` };
      const break_minutes = formData.get(`${prefix}_break`) ? Number(text(formData, `${prefix}_break_minutes`)) : null;
      if (break_minutes !== null && !(Number.isInteger(break_minutes) && break_minutes > 0)) {
        return { error: `${label}: enter the break in minutes.` };
      }
      const day = { week, weekday, starts_at, ends_at, break_minutes };
      if (paidMinutes(day) <= 0) return { error: `${label}: the break is longer than the shift.` };
      days.push(day);
    }
  }
  if (!days.length) return { error: "Tick at least one working day." };
  return { days };
}

export async function saveShiftPattern(employeeId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const effective_from = text(formData, "effective_from");
  if (!effective_from) return { error: "Enter the date the pattern applies from." };
  const alternating = !!formData.get("alternating");
  const week_a_from = alternating ? text(formData, "week_a_from") : null;
  if (alternating && !week_a_from) return { error: "Enter a date in a week A, so the portal knows which week is which." };

  const parsed = patternDays(formData, alternating ? ["A", "B"] : ["A"]);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  // Saving again for the same date replaces that pattern.
  await supabase.from("shift_patterns").delete().eq("employee_id", employeeId).eq("effective_from", effective_from);
  const { data: pattern, error } = await supabase
    .from("shift_patterns")
    .insert({ employee_id: employeeId, effective_from, week_a_from, created_by_name: actorName(session) })
    .select("id")
    .single();
  if (error) return failed(error);
  const { error: daysError } = await supabase
    .from("shift_pattern_days")
    .insert(parsed.days.map((d) => ({ ...d, pattern_id: pattern.id })));
  if (daysError) return failed(daysError);

  await refreshOpenMonthsFor(supabase, employeeId, actorName(session));
  revalidatePath(`/staff/${employeeId}`);
  return { message: "Shift pattern saved." };
}

export async function removeShiftPattern(employeeId: string, patternId: string) {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase.from("shift_patterns").delete().eq("id", patternId);
  await refreshOpenMonthsFor(supabase, employeeId, actorName(session));
  revalidatePath(`/staff/${employeeId}`);
}
