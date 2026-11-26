import { addDays, daysBetween } from "@/lib/dates";

// Months are "YYYY-MM" in URLs and the first day of the month ("YYYY-MM-01") in
// the database. Times of day are "HH:MM" (Postgres returns "HH:MM:SS").

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Column widths of the monthly wages table on wide screens.
export const WAGE_GRID = "xl:grid-cols-[11rem_8rem_12.5rem_9.5rem_9.5rem_8rem_7.5rem]";

// England and Wales bank holidays, when the nursery is closed. They count as
// holiday hours on contracted days. Add each new year's from gov.uk/bank-holidays.
export const BANK_HOLIDAYS = new Set([
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
  "2028-01-03", "2028-04-14", "2028-04-17", "2028-05-01", "2028-05-29", "2028-08-28", "2028-12-25", "2028-12-26",
]);

export function isMonthKey(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthStart(key: string) {
  return `${key}-01`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
}

export function monthDates(key: string) {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${key}-${String(i + 1).padStart(2, "0")}`);
}

// 1 = Monday … 7 = Sunday
export function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export type ShiftDay = {
  week: "A" | "B";
  weekday: number;
  starts_at: string;
  ends_at: string;
  break_minutes: number | null;
};

export type ShiftPattern = { effective_from: string; week_a_from: string | null; days: ShiftDay[] };

export function paidMinutes(day: Pick<ShiftDay, "starts_at" | "ends_at" | "break_minutes">) {
  return toMinutes(day.ends_at) - toMinutes(day.starts_at) - (day.break_minutes ?? 0);
}

// Which week of an alternating pattern a date falls in.
export function weekFor(date: string, weekAFrom: string) {
  const mondayA = addDays(weekAFrom, 1 - weekday(weekAFrom));
  const weeks = Math.floor(daysBetween(mondayA, date) / 7);
  return weeks % 2 === 0 ? "A" : "B";
}

// Contracted minutes for each working day of the month, from the pattern in
// force on each day. Days before the start date or after the leave date don't count.
export function contractedMinutes(
  key: string,
  employee: { start_date: string | null; leave_date: string | null },
  patterns: ShiftPattern[],
) {
  const sorted = [...patterns].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  const result: Record<string, number> = {};
  for (const date of monthDates(key)) {
    if (employee.start_date && date < employee.start_date) continue;
    if (employee.leave_date && date > employee.leave_date) continue;
    const pattern = sorted.find((p) => p.effective_from <= date);
    if (!pattern) continue;
    const week = pattern.week_a_from ? weekFor(date, pattern.week_a_from) : "A";
    const day = pattern.days.find((d) => d.week === week && d.weekday === weekday(date));
    if (day) result[date] = paidMinutes(day);
  }
  return result;
}

export type WageEntry = { kind: "sick_hours" | "sick_day" | "holiday"; date: string | null; minutes: number | null };

export type WageRowInput = {
  contracted: Record<string, number>;
  extra_minutes: number;
  overtime_minutes: number;
  closure_as_holiday: boolean | null;
};

// The month's figures for one employee, in minutes. Days off (bank holidays,
// closure days, holidays and sick days) are taken out of the contracted hours;
// bank holidays, holidays and closure days taken as holiday become holiday hours.
export function calculateWages(row: WageRowInput, entries: WageEntry[], closureDays: string[]) {
  const closures = new Set(closureDays);
  const holidayDates = new Set(entries.filter((e) => e.kind === "holiday").map((e) => e.date));
  const sickDates = new Set(entries.filter((e) => e.kind === "sick_day").map((e) => e.date));

  let contracted = 0;
  let daysOff = 0;
  let holiday = 0;
  let closureMinutes = 0;
  const sickDays: string[] = [];

  for (const [date, minutes] of Object.entries(row.contracted).sort()) {
    contracted += minutes;
    if (BANK_HOLIDAYS.has(date)) {
      daysOff += minutes;
      holiday += minutes;
    } else if (closures.has(date)) {
      daysOff += minutes;
      closureMinutes += minutes;
      if (row.closure_as_holiday) holiday += minutes;
    } else if (holidayDates.has(date)) {
      daysOff += minutes;
      holiday += minutes;
    } else if (sickDates.has(date)) {
      daysOff += minutes;
      sickDays.push(date);
    }
  }

  const sickMinutes = entries.filter((e) => e.kind === "sick_hours").reduce((sum, e) => sum + (e.minutes ?? 0), 0);

  return {
    contracted,
    worked: contracted - daysOff - sickMinutes + row.extra_minutes,
    holiday,
    sickMinutes,
    sickDays,
    overtime: row.overtime_minutes,
    // Closure days fall on this person's working days but no choice is made yet.
    closurePending: closureMinutes > 0 && row.closure_as_holiday === null,
  };
}

// 9h 05m, −25m
export function formatMinutes(total: number) {
  const sign = total < 0 ? "−" : "";
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (!h) return `${sign}${m}m`;
  return `${sign}${h}h ${String(m).padStart(2, "0")}m`;
}

// Decimal hours for QuickBooks, e.g. 151.75
export function decimalHours(total: number) {
  return (total / 60).toFixed(2);
}
