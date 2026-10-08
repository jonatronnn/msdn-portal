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
