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

export function weekdayName(day: number) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day];
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

export type EventEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  start_date: string | null;
  leave_date: string | null;
};

export type StaffEvent = {
  date: string;
  type: "birthday" | "anniversary" | "start" | "leave";
  employeeId: string;
  name: string;
  label: string;
};

// The date a yearly event (birthday, work anniversary) falls on in `year`.
// 29 February is marked on 28 February in non-leap years.
function occurrence(iso: string, year: number) {
  const [, m, d] = iso.split("-").map(Number);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Staff events from `from` for `days` days (inclusive of `from`).
export function upcomingEvents(employees: EventEmployee[], from: string, days: number): StaffEvent[] {
  const to = addDays(from, days - 1);
  const inRange = (d: string) => d >= from && d <= to;
  const years = [...new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))])];
  const events: StaffEvent[] = [];

  for (const e of employees) {
    const name = `${e.first_name} ${e.last_name}`;
    const employedOn = (d: string) => (!e.leave_date || e.leave_date >= d) && (!e.start_date || e.start_date <= d);

    for (const year of years) {
      if (e.date_of_birth) {
        const d = occurrence(e.date_of_birth, year);
        if (inRange(d) && employedOn(d)) events.push({ date: d, type: "birthday", employeeId: e.id, name, label: "Birthday" });
      }
      if (e.start_date) {
        const d = occurrence(e.start_date, year);
        const serviceYears = year - Number(e.start_date.slice(0, 4));
        if (serviceYears > 0 && inRange(d) && employedOn(d)) {
          events.push({
            date: d,
            type: "anniversary",
            employeeId: e.id,
            name,
            label: `${serviceYears} year${serviceYears === 1 ? "" : "s"} at the nursery`,
          });
        }
      }
    }
    if (e.start_date && inRange(e.start_date)) {
      events.push({ date: e.start_date, type: "start", employeeId: e.id, name, label: "First day" });
    }
    if (e.leave_date && inRange(e.leave_date)) {
      events.push({ date: e.leave_date, type: "leave", employeeId: e.id, name, label: "Last day" });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
