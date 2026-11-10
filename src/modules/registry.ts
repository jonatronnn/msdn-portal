import type { Role } from "@/lib/auth";

// The portal's modules. To add one: create its pages under src/app/(portal)/,
// its tables in a new supabase/migrations file, and an entry here. The sidebar
// shows each link only to the roles listed.
export type NavItem = { href: string; label: string; roles: Role[] };
export type Module = { name: string; items: NavItem[] };

const managers: Role[] = ["admin", "manager"];
const owner: Role[] = ["admin"];

export const modules: Module[] = [
  {
    name: "Overview",
    items: [{ href: "/", label: "Dashboard", roles: managers }],
  },
  {
    name: "Staff",
    items: [
      { href: "/staff", label: "Staff directory", roles: managers },
      { href: "/onboarding", label: "Onboarding", roles: managers },
    ],
  },
  {
    name: "Children",
    items: [{ href: "/children", label: "New children", roles: managers }],
  },
  {
    name: "Admin",
    items: [
      { href: "/admin/users", label: "Users", roles: owner },
      { href: "/admin/settings", label: "Training & checklist", roles: owner },
    ],
  },
];

export function navFor(role: Role) {
  return modules
    .map((m) => ({ ...m, items: m.items.filter((i) => i.roles.includes(role)) }))
    .filter((m) => m.items.length > 0);
}
