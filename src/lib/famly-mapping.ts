// Converting staff records to and from Famly's employee format
// (https://docs.famly.co). Kept free of network code so it can be tested.

import { QUALIFICATION_LEVELS } from "@/lib/staff";

export type FamlyGender = "FEMALE" | "MALE" | "DIVERSE";

// Famly's "Diverse" is shown as non-binary in the portal; blank is not specified.
const GENDERS: Record<FamlyGender, string> = { MALE: "Male", FEMALE: "Female", DIVERSE: "Non-binary" };

export type FamlyQualification = {
  qualificationTypeId: string;
  validFrom: string;
  validTo: string | null;
  qualificationType: { name: string };
};

export type FamlyEmployee = {
  id: string;
  name: { firstName: string; middleName: string | null; lastName: string | null };
  email: string | null;
  title: string | null;
  birthDate: string | null;
  phoneNumber: { value: string; formatted: string | null } | null;
  address: { street: string; zip: string; city: string } | null;
  firstDay: string;
  lastDay: string | null;
  groupId: string;
  siteId: string;
  gender: FamlyGender | null;
  qualificationTypeAssignments: FamlyQualification[];
};

type PortalEmployee = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  job_title: string | null;
  date_of_birth: string | null;
  mobile_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  town: string | null;
  postcode: string | null;
  start_date: string | null;
  leave_date: string | null;
  gender: string | null;
};

// Famly wants international numbers; UK numbers starting 0 become +44.
export function toInternationalPhone(phone: string) {
  const digits = phone.replace(/[\s()-]/g, "");
  if (/^\+\d{7,15}$/.test(digits)) return digits;
  if (/^0\d{9,10}$/.test(digits)) return `+44${digits.slice(1)}`;
  if (/^44\d{9,10}$/.test(digits)) return `+${digits}`;
  return phone.trim();
}

// The qualification Famly shows for them today, or failing that the latest one.
export function currentQualification(assignments: FamlyQualification[], today: string) {
  const current = assignments.find((a) => a.validFrom <= today && (!a.validTo || a.validTo >= today));
  return current ?? assignments.at(-1) ?? null;
}

// Famly qualification types are named by each nursery; only names matching a
// portal level (e.g. "Level 3") are brought across.
function qualificationFields(assignments: FamlyQualification[], today: string) {
  const q = currentQualification(assignments, today);
  const level = q && QUALIFICATION_LEVELS.find((l) => l.toLowerCase() === q.qualificationType.name.trim().toLowerCase());
  return level ? { qualification_level: level, qualification_date: q.validFrom } : { qualification_level: null, qualification_date: null };
}

export function toFamlyGender(gender: string | null): FamlyGender | null {
  return (Object.keys(GENDERS) as FamlyGender[]).find((k) => GENDERS[k] === gender) ?? null;
}

export function fromFamly(e: FamlyEmployee, today: string) {
  return {
    first_name: e.name.firstName,
    middle_name: e.name.middleName || null,
    last_name: e.name.lastName ?? "",
    email: e.email?.toLowerCase() ?? "",
    job_title: e.title || null,
    date_of_birth: e.birthDate,
    mobile_phone: e.phoneNumber ? (e.phoneNumber.formatted ?? e.phoneNumber.value) : null,
    address_line1: e.address?.street || null,
    town: e.address?.city || null,
    postcode: e.address?.zip?.toUpperCase() || null,
    start_date: e.firstDay,
    leave_date: e.lastDay,
    gender: e.gender ? GENDERS[e.gender] : null,
    ...qualificationFields(e.qualificationTypeAssignments ?? [], today),
    famly_id: e.id,
    famly_group_id: e.groupId,
  };
}

// The details the portal sends to Famly. Blank portal fields are left out so
// they never wipe something already in Famly.
export function toFamly(e: PortalEmployee) {
  const hasAddress = e.address_line1 && e.town && e.postcode;
  return {
    name: [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" "),
    email: e.email || null,
    title: e.job_title,
    birthDate: e.date_of_birth,
    phoneNumber: e.mobile_phone ? toInternationalPhone(e.mobile_phone) : null,
    address: hasAddress
      ? { street: [e.address_line1, e.address_line2].filter(Boolean).join(", "), zip: e.postcode!, city: e.town! }
      : null,
    firstDay: e.start_date,
    lastDay: e.leave_date,
    gender: toFamlyGender(e.gender),
  };
}

// Famly's details with the blanks dropped, for refreshing a linked record:
// a field Famly leaves empty (or hides from the token) never wipes the portal.
export function changesFromFamly(e: FamlyEmployee, today: string) {
  const fields = fromFamly(e, today);
  return Object.fromEntries(
    Object.entries(fields).filter(([k, v]) => k !== "famly_id" && v !== null && v !== ""),
  ) as Partial<Omit<typeof fields, "famly_id">>;
}
