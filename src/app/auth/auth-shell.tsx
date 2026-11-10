import type { ReactNode } from "react";
import { Logo } from "@/components/icons";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 p-12 text-white lg:flex">
        <Logo className="h-12 w-12" />
        <div>
          <p className="text-3xl font-semibold leading-snug">
            Montagu Square
            <br />
            Day Nursery
          </p>
          <p className="mt-3 max-w-sm text-teal-100">The staff portal for owners and managers.</p>
        </div>
        <p className="text-xs text-teal-200/70">Private and secure. Sign-in is protected by two-step verification.</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <p className="font-semibold text-teal-900">Montagu Square Day Nursery</p>
          </div>
          <h1 className="mb-6 text-2xl font-semibold text-stone-900">{title}</h1>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200/80">{children}</div>
        </div>
      </div>
    </main>
  );
}
