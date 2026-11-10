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
        active ? "bg-white/15 font-medium text-white shadow-inner" : "text-teal-100/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon name={icon} className={`h-[18px] w-[18px] shrink-0 ${active ? "text-amber-300" : ""}`} />
      {label}
    </Link>
  );
}
