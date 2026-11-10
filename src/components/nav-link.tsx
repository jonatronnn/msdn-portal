"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

export function NavLink({ href, label, icon }: { href: string; label: string; icon: IconName }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-brand-50 font-semibold text-brand-800" : "text-stone-600 hover:bg-stone-100 hover:text-brand-800"
      }`}
    >
      <Icon name={icon} className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-600" : "text-stone-400"}`} />
      {label}
    </Link>
  );
}
