// Pay rates. Hourly staff are paid from the pay_rates table by age and
// qualification level; Room Leaders and Senior Practitioners have flat rates;
// DSL and SENCo add an extra per hour. Managers are salaried (entered on their
// record) and Directors have no pay.

export const JOB_TITLES = [
  "Apprentice",
  "Practitioner",
  "Senior Practitioner",
  "Room Leader",
  "Chef",
  "Deputy Manager",
  "Manager",
  "Director",
];
export const SALARIED_TITLES = ["Manager", "Deputy Manager"];
export const UNPAID_TITLES = ["Director"];

export const PAY_RATE_KEYS = [
  { key: "under_18", label: "Under 18 or apprentice" },
  { key: "age_18_unqualified", label: "18 to 20, unqualified" },
  { key: "age_18_level_2", label: "18 to 20, Level 2 or 3" },
  { key: "age_21_unqualified", label: "21 and over, unqualified" },
  { key: "age_21_level_2", label: "21 and over, Level 2" },
  { key: "age_21_level_3", label: "21 and over, Level 3" },
  { key: "room_leader", label: "Room Leader" },
  { key: "senior", label: "Senior Practitioner" },
  { key: "dsl_extra", label: "DSL extra per hour" },
  { key: "senco_extra", label: "SENCo extra per hour" },
] as const;
export type PayRateKey = (typeof PAY_RATE_KEYS)[number]["key"];
export type PayRates = Partial<Record<string, number>>;

// UK National Minimum Wage from 1 April 2026. Update each April.
export const MINIMUM_WAGE = { age21: 12.71, age18: 10.85, under18: 8.0 };
// The legal minimum for each table rate, for the warning on the Pay rates page.
export const MINIMUM_FOR_KEY: Partial<Record<PayRateKey, number>> = {
  under_18: MINIMUM_WAGE.under18,
  age_18_unqualified: MINIMUM_WAGE.age18,
  age_18_level_2: MINIMUM_WAGE.age18,
  age_21_unqualified: MINIMUM_WAGE.age21,
  age_21_level_2: MINIMUM_WAGE.age21,
  age_21_level_3: MINIMUM_WAGE.age21,
  room_leader: MINIMUM_WAGE.age21,
  senior: MINIMUM_WAGE.age21,
};

// Whole years between a YYYY-MM-DD date of birth and today.
export function ageOn(dob: string, today: string) {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

type PayDetails = {
  job_title: string | null;
  qualification_level: string | null;
  date_of_birth: string | null;
  is_dsl: boolean;
  is_senco: boolean;
  apprenticeship_start_date: string | null;
};

// Apprentices move from the apprentice rate to the rate for their age once
// they are 19 or over and have finished the first year of their apprenticeship.
export function apprenticeRateEnds(e: { date_of_birth: string | null; apprenticeship_start_date: string | null }) {
  if (!e.date_of_birth || !e.apprenticeship_start_date) return null;
  const [y, m, d] = e.date_of_birth.split("-").map(Number);
  const [sy, sm, sd] = e.apprenticeship_start_date.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const turns19 = `${y + 19}-${pad(m)}-${pad(d)}`;
  const yearDone = `${sy + 1}-${pad(sm)}-${pad(sd)}`;
  return turns19 > yearDone ? turns19 : yearDone;
}

export type HourlyPay = { rate: number; basis: string } | { missing: string };

// The hourly rate from the table, or what's missing to work it out. Null for
// salaried and unpaid job titles.
export function hourlyPay(e: PayDetails, rates: PayRates, today: string): HourlyPay | null {
  const title = e.job_title ?? "";
  if (SALARIED_TITLES.includes(title) || UNPAID_TITLES.includes(title)) return null;

  let key: PayRateKey;
  if (title === "Room Leader") key = "room_leader";
  else if (title === "Senior Practitioner") key = "senior";
  else if (title === "Apprentice" && !((apprenticeRateEnds(e) ?? "9999") <= today)) key = "under_18";
  else {
    if (!e.date_of_birth) return { missing: "date of birth" };
    const age = ageOn(e.date_of_birth, today);
    const level = e.qualification_level;
    if (age < 18) key = "under_18";
    else if (age < 21) key = level === "Level 2" || level === "Level 3" ? "age_18_level_2" : "age_18_unqualified";
    else key = level === "Level 3" ? "age_21_level_3" : level === "Level 2" ? "age_21_level_2" : "age_21_unqualified";
  }

  const base = rates[key];
  if (base == null) return { missing: "pay rate" };
  const extras = [e.is_dsl && "dsl_extra", e.is_senco && "senco_extra"].filter((k): k is PayRateKey => !!k);
  const rate = base + extras.reduce((sum, k) => sum + (rates[k] ?? 0), 0);
  const labels = [PAY_RATE_KEYS.find((k) => k.key === key)!.label, e.is_dsl && "DSL", e.is_senco && "SENCo"].filter(Boolean);
  return { rate: Math.round(rate * 100) / 100, basis: labels.join(" + ") };
}
