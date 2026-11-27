import { daysBetween, nextMilestone } from "@/lib/dates";

export const QUALIFICATION_LEVELS = ["Unqualified", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7"];

// Blank means not specified.
export const GENDERS = ["Male", "Female", "Non-binary"];

// Why employment ended, for the End of employment form.
export const LEAVE_REASONS = [
  "Resignation",
  "End of fixed-term contract",
  "Dismissal",
  "Termination",
  "Redundancy",
  "Retirement",
  "Mutual agreement",
  "End of probation",
  "Death",
  "Other",
];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Don't know"];

// Countries and regions, for suggesting a place of birth.
const REGION_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");
export function countryNames() {
  const names = new Intl.DisplayNames(["en-GB"], { type: "region" });
  return REGION_CODES.map((c) => names.of(c) ?? c).sort((a, b) => a.localeCompare(b));
}

const BLANK_MEDICAL = { doctor_name: null, doctor_address: null, doctor_phone: null, blood_type: null, medical_conditions: null, allergies: null };
export type MedicalDetails = { [K in keyof typeof BLANK_MEDICAL]: string | null };

// The medical section, as filled in on the starter form or the edit page.
export function medicalFields(formData: FormData): MedicalDetails {
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const fields = Object.fromEntries(Object.keys(BLANK_MEDICAL).map((k) => [k, get(k)])) as MedicalDetails;
  if (fields.blood_type && !BLOOD_TYPES.includes(fields.blood_type)) fields.blood_type = null;
  return fields;
}

export type IdNumbers = { passportNumber: string | null; drivingLicenceNumber: string | null };

// Passport and licence numbers are stored without spaces, in capitals.
export function normaliseIdNumber(value: string | null) {
  return value ? value.replace(/\s+/g, "").toUpperCase() : null;
}

// New starters get the next employee ID: 070, 071 and so on.
const FIRST_PAYROLL_NUMBER = 70;
export function nextPayrollId(existing: (string | null)[]) {
  const numbers = existing.map((id) => /^(?:PR)?(\d+)$/i.exec(id ?? "")?.[1]).filter(Boolean).map(Number);
  const next = Math.max(FIRST_PAYROLL_NUMBER - 1, ...numbers) + 1;
  return String(next).padStart(3, "0");
}

export function fullName(e: { first_name: string; last_name: string }) {
  return `${e.first_name} ${e.last_name}`;
}

export const STAFF_SORT_KEYS = ["payroll_id", "name", "job_title", "start_date", "leave_date", "service", "anniversary", "leave_reason"] as const;
export type StaffSortKey = (typeof STAFF_SORT_KEYS)[number];

type DirectoryRow = {
  payroll_id: string | null;
  first_name: string;
  last_name: string;
  job_title: string | null;
  start_date: string | null;
  leave_date: string | null;
  leave_reason: string | null;
};

// Sorts the staff directory by one column. Blanks always go last.
export function sortStaff<T extends DirectoryRow>(rows: T[], key: StaffSortKey, dir: "asc" | "desc", today: string) {
  const value = (e: T): string | number | null => {
    switch (key) {
      case "name":
        return `${e.last_name} ${e.first_name}`;
      case "service":
        return e.start_date ? daysBetween(e.start_date, e.leave_date && e.leave_date < today ? e.leave_date : today) : null;
      case "anniversary":
        return e.start_date ? (nextMilestone(e.start_date, today)?.date ?? null) : null;
      default:
        return e[key] || null;
    }
  };
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((row) => ({ row, v: value(row) }))
    .sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === b.v ? 0 : a.v === null ? 1 : -1;
      const c = typeof a.v === "number" ? a.v - (b.v as number) : a.v.localeCompare(b.v as string, "en-GB", { sensitivity: "base", numeric: true });
      return c * sign;
    })
    .map(({ row }) => row);
}

export function formatAddress(e: {
  address_line1: string | null;
  address_line2: string | null;
  town: string | null;
  postcode: string | null;
}) {
  return [e.address_line1, e.address_line2, e.town, e.postcode].filter(Boolean).join(", ");
}

export const NI_NUMBER_ERROR = "That National Insurance number doesn't look right. It should look like AB 12 34 56 C.";

// Returns a UK National Insurance number in its stored form ("QQ123456C"), or
// null if it isn't a valid format. Accepts spaces and lower case.
export function normaliseNiNumber(input: string) {
  const ni = input.replace(/\s+/g, "").toUpperCase();
  const valid =
    /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][0-9]{6}[A-D]$/.test(ni) && !/^(BG|GB|KN|NK|NT|TN|ZZ)/.test(ni);
  return valid ? ni : null;
}

export function formatNiNumber(ni: string | null) {
  return ni ? ni.replace(/^(..)(..)(..)(..)(.)$/, "$1 $2 $3 $4 $5") : "";
}

export const CONTRACT_TYPES = ["Permanent", "Fixed-term", "Bank / relief", "Apprentice"];

export function formatPay(rate: number | null, basis: string | null) {
  if (rate == null || !basis) return "";
  const amount = rate.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
  return basis === "hourly" ? `${amount} per hour` : `${amount} per year`;
}

type EmploymentDetails = {
  job_title: string | null;
  start_date: string | null;
  contract_type: string | null;
  contract_end_date: string | null;
  notice_period: string | null;
  working_pattern: string | null;
  contracted_hours: number | null;
  pay_rate: number | null;
  pay_rate_basis: string | null;
  qualification_level: string | null;
  qualification_date: string | null;
};

// The manager-entered details that are still blank. When this is empty the
// "Employment details completed" onboarding step ticks itself.
export function missingEmploymentDetails(e: EmploymentDetails) {
  const missing: string[] = [];
  if (!e.job_title) missing.push("job title");
  if (!e.start_date) missing.push("start date");
  if (!e.contract_type) missing.push("contract type");
  if (e.contract_type === "Fixed-term" && !e.contract_end_date) missing.push("contract end date");
  if (!e.notice_period) missing.push("notice period");
  if (!e.working_pattern) missing.push("working pattern");
  if (e.contracted_hours == null) missing.push("contracted hours");
  if (e.pay_rate == null || !e.pay_rate_basis) missing.push("pay rate");
  if (!e.qualification_level) missing.push("qualification level");
  if (e.qualification_level && e.qualification_level !== "Unqualified" && !e.qualification_date) {
    missing.push("qualification date");
  }
  return missing;
}

export type BankDetails = { accountName: string; sortCode: string; accountNumber: string };

// Sort code as 6 digits ("12-34-56" and "12 34 56" accepted), or null.
export function normaliseSortCode(input: string) {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

// UK account numbers are 8 digits; older 7-digit ones are padded with a
// leading zero, as banks do.
export function normaliseAccountNumber(input: string) {
  const digits = input.replace(/\s/g, "");
  if (/^\d{8}$/.test(digits)) return digits;
  if (/^\d{7}$/.test(digits)) return `0${digits}`;
  return null;
}

export function formatSortCode(sortCode: string) {
  return sortCode.replace(/^(\d\d)(\d\d)(\d\d)$/, "$1-$2-$3");
}
