// Converting staff records to and from Famly's employee format
// (https://docs.famly.co). Kept free of network code so it can be tested.

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
};

type PortalEmployee = {
  first_name: string;
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
};

// Famly wants international numbers; UK numbers starting 0 become +44.
export function toInternationalPhone(phone: string) {
  const digits = phone.replace(/[\s()-]/g, "");
  if (/^\+\d{7,15}$/.test(digits)) return digits;
  if (/^0\d{9,10}$/.test(digits)) return `+44${digits.slice(1)}`;
  if (/^44\d{9,10}$/.test(digits)) return `+${digits}`;
  return phone.trim();
}

export function fromFamly(e: FamlyEmployee) {
  return {
    first_name: e.name.firstName,
    last_name: [e.name.middleName, e.name.lastName].filter(Boolean).join(" "),
    email: e.email?.toLowerCase() ?? "",
    job_title: e.title || null,
    date_of_birth: e.birthDate,
    mobile_phone: e.phoneNumber ? (e.phoneNumber.formatted ?? e.phoneNumber.value) : null,
    address_line1: e.address?.street || null,
    town: e.address?.city || null,
    postcode: e.address?.zip?.toUpperCase() || null,
    start_date: e.firstDay,
    leave_date: e.lastDay,
    famly_id: e.id,
    famly_group_id: e.groupId,
  };
}

// The details the portal sends to Famly. Blank portal fields are left out so
// they never wipe something already in Famly.
export function toFamly(e: PortalEmployee) {
  const hasAddress = e.address_line1 && e.town && e.postcode;
  return {
    name: `${e.first_name} ${e.last_name}`.trim(),
    email: e.email || null,
    title: e.job_title,
    birthDate: e.date_of_birth,
    phoneNumber: e.mobile_phone ? toInternationalPhone(e.mobile_phone) : null,
    address: hasAddress
      ? { street: [e.address_line1, e.address_line2].filter(Boolean).join(", "), zip: e.postcode!, city: e.town! }
      : null,
    firstDay: e.start_date,
    lastDay: e.leave_date,
  };
}
