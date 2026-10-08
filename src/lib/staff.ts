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
