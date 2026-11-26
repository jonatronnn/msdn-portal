import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { calculateWages, contractedMinutes, monthDates, monthStart, type ShiftDay, type WageEntry } from "@/lib/wages";

type Client = SupabaseClient<Database>;

// Adds everyone employed during the month and works out their contracted
// hours from their shift patterns. Existing rows keep what managers entered;
// only the contracted hours are refreshed. Pass employeeIds to refresh just those.
export async function refreshWageRows(db: Client, key: string, byName: string, employeeIds?: string[]) {
  const dates = monthDates(key);
  let query = db
    .from("employees")
    .select("id, start_date, leave_date, shift_patterns(effective_from, week_a_from, shift_pattern_days(*))")
    .or(`start_date.is.null,start_date.lte.${dates[dates.length - 1]}`)
    .or(`leave_date.is.null,leave_date.gte.${dates[0]}`);
  if (employeeIds) query = query.in("id", employeeIds);
  const { data: employees, error } = await query;
  if (error || !employees.length) return error;

  const rows = employees.map((e) => ({
    month: monthStart(key),
    employee_id: e.id,
    contracted: contractedMinutes(
      key,
      e,
      e.shift_patterns.map((p) => ({ ...p, days: p.shift_pattern_days as ShiftDay[] })),
    ),
    updated_at: new Date().toISOString(),
    updated_by_name: byName,
  }));
  const { error: upsertError } = await db.from("wage_rows").upsert(rows, { onConflict: "month,employee_id" });
  return upsertError;
}

// After a shift pattern or employment date changes, refresh that employee in
// every month still open.
export async function refreshOpenMonthsFor(db: Client, employeeId: string, byName: string) {
  const { data: months } = await db.from("wage_months").select("month").eq("status", "open");
  for (const { month } of months ?? []) {
    await refreshWageRows(db, month.slice(0, 7), byName, [employeeId]);
  }
}

// Everything the month's page and CSV need, with each row's totals worked out.
export async function loadWageMonth(db: Client, key: string) {
  const [{ data: month }, { data: rows }, { data: closures }] = await Promise.all([
    db.from("wage_months").select("*").eq("month", monthStart(key)).maybeSingle(),
    db
      .from("wage_rows")
      .select("*, employees(first_name, last_name, payroll_id, start_date, leave_date), wage_entries(*)")
      .eq("month", monthStart(key)),
    db.from("wage_closure_days").select("date").eq("month", monthStart(key)).order("date"),
  ]);
  const closureDays = (closures ?? []).map((c) => c.date);
  const staff = (rows ?? [])
    .map((r) => {
      const contracted = r.contracted as Record<string, number>;
      const entries = r.wage_entries.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      return {
        ...r,
        contracted,
        entries,
        totals: calculateWages({ ...r, contracted }, entries as WageEntry[], closureDays),
      };
    })
    .sort((a, b) => `${a.employees.last_name} ${a.employees.first_name}`.localeCompare(`${b.employees.last_name} ${b.employees.first_name}`));
  return { month, staff, closureDays };
}
