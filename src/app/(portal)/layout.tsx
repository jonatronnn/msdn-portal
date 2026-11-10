import Link from "next/link";
import { Icon, Logo } from "@/components/icons";
import { NavLink } from "@/components/nav-link";
import { requireSession } from "@/lib/auth";
import { navFor } from "@/modules/registry";

const roleNames = { admin: "Owner", manager: "Manager" };

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const nav = navFor(session.role);
  const name = session.fullName || session.email;
  const initials = name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col bg-gradient-to-b from-teal-900 to-teal-800 text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <Link href="/" className="flex items-center gap-3 px-5 py-5">
          <Logo />
          <span className="font-semibold leading-tight">
            Montagu Square
            <span className="block text-sm font-normal text-teal-200">Day Nursery</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {nav.map((m) => (
            <div key={m.name}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-300/70">{m.name}</p>
              <div className="space-y-0.5">
                {m.items.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4 text-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300 font-semibold text-teal-900">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{name}</p>
            <p className="text-xs text-teal-200">{roleNames[session.role]}</p>
          </div>
          <a href="/auth/signout" className="rounded-lg p-2 text-teal-200 hover:bg-white/10 hover:text-white" title="Sign out">
            <Icon name="logout" className="h-[18px] w-[18px]" />
            <span className="sr-only">Sign out</span>
          </a>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
