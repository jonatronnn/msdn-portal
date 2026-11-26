"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { failed, text, type ActionState } from "@/lib/action-state";
import { actorName, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BANK_HOLIDAYS, calculateWages, isMonthKey, monthStart, type WageEntry } from "@/lib/wages";
import { refreshWageRows } from "@/lib/wages-server";

const done = (key: string) => revalidatePath(`/wages/${key}`);

export async function startMonth(key: string): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  if (!isMonthKey(key)) return { error: "Not a valid month." };
  const supabase = await createClient();
  const { error } = await supabase.from("wage_months").insert({ month: monthStart(key), started_by_name: actorName(session) });
  if (error) return failed(error);
  const refreshError = await refreshWageRows(supabase, key, actorName(session));
  if (refreshError) return failed(refreshError);
  done(key);
  return null;
}

export async function refreshMonth(key: string): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const supabase = await createClient();
  const error = await refreshWageRows(supabase, key, actorName(session));
  if (error) return failed(error);
  done(key);
  return { message: "Staff and contracted hours updated from the staff records." };
}

async function updateRow(key: string, rowId: string, fields: { extra_minutes?: number; overtime_minutes?: number; closure_as_holiday?: boolean | null }) {
  const session = await requireSession("admin", "manager");
  const supabase = await createClient();
  const { error } = await supabase
    .from("wage_rows")
    .update({ ...fields, updated_at: new Date().toISOString(), updated_by_name: actorName(session) })
    .eq("id", rowId);
  done(key);
  return failed(error);
}

export async function setExtraMinutes(key: string, rowId: string, minutes: number) {
  if (!Number.isInteger(minutes)) return { error: "Not a valid number of minutes." };
  return updateRow(key, rowId, { extra_minutes: minutes });
}

export async function setOvertime(key: string, rowId: string, minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 0) return { error: "Not a valid number of minutes." };
  return updateRow(key, rowId, { overtime_minutes: minutes });
}

export async function setClosureChoice(key: string, rowId: string, asHoliday: boolean | null) {
  return updateRow(key, rowId, { closure_as_holiday: asHoliday });
}

export async function addSickHours(key: string, rowId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const minutes = Number(formData.get("hours")) * 60 + Number(formData.get("minutes"));
  if (!(minutes > 0)) return { error: "Choose the hours and minutes." };
  const date = text(formData, "date");
  if (date && !date.startsWith(key)) return { error: "Pick a date in this month." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wage_entries")
    .insert({ row_id: rowId, kind: "sick_hours", minutes, date, created_by_name: actorName(session) });
  if (error) return failed(error);
  done(key);
  return { message: "Added." };
}

export async function addDay(key: string, rowId: string, kind: "sick_day" | "holiday", _: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession("admin", "manager");
  const date = text(formData, "date");
  if (!date) return { error: "Pick a date." };

  const supabase = await createClient();
  const { data: row } = await supabase.from("wage_rows").select("month, contracted").eq("id", rowId).single();
  const { data: closures } = await supabase.from("wage_closure_days").select("date").eq("month", monthStart(key));
  if (!row) return { error: "Not found." };
  if (!(date in (row.contracted as Record<string, number>))) return { error: "That isn't one of their working days this month." };
  if (BANK_HOLIDAYS.has(date)) return { error: "That's a bank holiday, which already counts as holiday." };
  if (closures?.some((c) => c.date === date)) return { error: "The nursery is closed that day; see Closure days." };

  const { error } = await supabase.from("wage_entries").insert({ row_id: rowId, kind, date, created_by_name: actorName(session) });
  if (error?.code === "23505") return { error: "That day is already marked as a sick day or holiday." };
  if (error) return failed(error);
  done(key);
  return { message: "Added." };
}

export async function removeEntry(key: string, entryId: string): Promise<ActionState> {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  const { error } = await supabase.from("wage_entries").delete().eq("id", entryId);
  done(key);
  return failed(error);
}

export async function addClosureDay(key: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession("admin", "manager");
  const date = text(formData, "date");
  if (!date?.startsWith(key)) return { error: "Pick a date in this month." };
  if (BANK_HOLIDAYS.has(date)) return { error: "That's a bank holiday, which is already included." };

  const supabase = await createClient();
  const { error } = await supabase.from("wage_closure_days").insert({ month: monthStart(key), date });
  if (error) return failed(error);
  done(key);
  return { message: "Added." };
}

export async function removeClosureDay(key: string, date: string) {
  await requireSession("admin", "manager");
  const supabase = await createClient();
  await supabase.from("wage_closure_days").delete().eq("month", monthStart(key)).eq("date", date);
  done(key);
}

export async function setMonthStatus(key: string, status: "open" | "finalised" | "archived"): Promise<ActionState> {
  const session = await requireSession("admin");
  const supabase = await createClient();

  if (status === "finalised") {
    const [{ data: rows }, { data: closures }] = await Promise.all([
      supabase.from("wage_rows").select("*, wage_entries(kind, date, minutes)").eq("month", monthStart(key)),
      supabase.from("wage_closure_days").select("date").eq("month", monthStart(key)),
    ]);
    const closureDates = (closures ?? []).map((c) => c.date);
    const pending = (rows ?? []).filter(
      (r) =>
        calculateWages(
          { ...r, contracted: r.contracted as Record<string, number> },
          r.wage_entries as WageEntry[],
          closureDates,
        ).closurePending,
    );
    if (pending.length) return { error: "Choose holiday or unpaid for the closure days for everyone first." };
  }

  const now = new Date().toISOString();
  const by = actorName(session);
  const fields =
    status === "finalised"
      ? { status, finalised_at: now, finalised_by_name: by }
      : status === "archived"
        ? { status, archived_at: now, archived_by_name: by }
        : { status, finalised_at: null, finalised_by_name: null };
  const { error } = await supabase.from("wage_months").update(fields).eq("month", monthStart(key));
  if (error) return failed(error);
  done(key);
  return null;
}

export async function deleteMonth(key: string): Promise<ActionState> {
  await requireSession("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("wage_months").delete().eq("month", monthStart(key));
  if (error) return failed(error);
  redirect(`/wages/${key}`);
}
