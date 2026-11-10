// Dates are handled as "YYYY-MM-DD" strings (as stored in Postgres) and
// compared in UTC, so time zones and clock changes can't shift a day.

const DAY_MS = 86_400_000;

function toUtc(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  return toIso(toUtc(iso) + days * DAY_MS);
}

// Today's date at the nursery.
export function todayInLondon(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    toUtc(iso.slice(0, 10)),
  );
}

// Whole years and months from start to end (end defaults to today).
export function lengthOfService(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let months = (ey - sy) * 12 + (em - sm);
  if (ed < sd) months -= 1;
  if (months < 0) return null;
  return { years: Math.floor(months / 12), months: months % 12 };
}

export function formatLengthOfService(start: string | null, leaveDate: string | null, today: string) {
  if (!start) return "";
  const end = leaveDate && leaveDate < today ? leaveDate : today;
  const service = lengthOfService(start, end);
  if (!service) return "Not started";
  const parts = [];
  if (service.years) parts.push(`${service.years} yr${service.years === 1 ? "" : "s"}`);
  if (service.months || !service.years) parts.push(`${service.months} mth${service.months === 1 ? "" : "s"}`);
  return parts.join(" ");
}

export function isCurrentEmployee(e: { leave_date: string | null }, today: string) {
  return !e.leave_date || e.leave_date >= today;
}

// The date a yearly event (such as a work anniversary) falls on in `year`.
// 29 February is marked on 28 February in non-leap years.
function occurrence(iso: string, year: number) {
  const [, m, d] = iso.split("-").map(Number);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

export function daysBetween(from: string, to: string) {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export const MILESTONE_YEARS = [1, 5, 10, 15, 20];

// The next major work anniversary on or after today, or null once the last
// one has passed.
export function nextMilestone(start: string, today: string) {
  const startYear = Number(start.slice(0, 4));
  for (const years of MILESTONE_YEARS) {
    const date = occurrence(start, startYear + years);
    if (date >= today) return { years, date };
  }
  return null;
}

// "today", "in 12 days", "in 3 mths", "in 1 yr 2 mths"
export function formatTimeUntil(today: string, date: string) {
  const days = daysBetween(today, date);
  if (days === 0) return "today";
  const span = lengthOfService(today, date)!;
  if (span.years === 0 && span.months === 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  return `in ${formatLengthOfService(today, date, date)}`;
}
