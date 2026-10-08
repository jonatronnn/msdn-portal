import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { navFor } from "@/modules/registry";

const roleNames = { admin: "Owner / admin", manager: "Manager", staff: "Staff" };

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const nav = navFor(session.role);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-stone-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="p-4">
          <Link href="/" className="block font-semibold leading-tight text-teal-800">
            Montagu Square
            <br />
            Day Nursery
          </Link>
        </div>
        <nav className="space-y-4 px-2 pb-4">
          {nav.map((m) => (
            <div key={m.name}>
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">{m.name}</p>
              {m.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-4 text-sm">
          <p className="font-medium">{session.fullName || session.email}</p>
          <p className="text-stone-500">{roleNames[session.role]}</p>
          <a href="/auth/signout" className="mt-2 inline-block text-teal-700 hover:underline">
            Sign out
          </a>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
