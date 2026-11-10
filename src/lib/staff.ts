export const QUALIFICATION_LEVELS = ["Unqualified", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7"];

export function fullName(e: { first_name: string; last_name: string }) {
  return `${e.first_name} ${e.last_name}`;
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
