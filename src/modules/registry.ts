import type { Role } from "@/lib/auth";

// The portal's modules. To add one: create its pages under src/app/(portal)/,
// its tables in a new supabase/migrations file, and an entry here. The sidebar
// shows each link only to the roles listed.
export type NavItem = { href: string; label: string; roles: Role[] };
export type Module = { name: string; items: NavItem[] };

const everyone: Role[] = ["admin", "manager", "staff"];
const managers: Role[] = ["admin", "manager"];

export const modules: Module[] = [
  {
    name: "Overview",
    items: [{ href: "/", label: "Dashboard", roles: everyone }],
  },
  {
    name: "Staff",
    items: [
      { href: "/staff", label: "Staff directory", roles: managers },
      { href: "/onboarding", label: "Onboarding", roles: managers },
      { href: "/me", label: "My details", roles: everyone },
      { href: "/handbook", label: "Policies & handbook", roles: everyone },
      { href: "/payslips", label: "Payslips", roles: everyone },
    ],
  },
  {
    name: "Admin",
    items: [
      { href: "/admin/users", label: "Users", roles: ["admin"] },
      { href: "/admin/settings", label: "Notifications", roles: ["admin"] },
    ],
  },
];

export function navFor(role: Role) {
  return modules
    .map((m) => ({ ...m, items: m.items.filter((i) => i.roles.includes(role)) }))
    .filter((m) => m.items.length > 0);
}
