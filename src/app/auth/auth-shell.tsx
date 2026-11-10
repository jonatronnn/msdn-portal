import type { ReactNode } from "react";
import { Logo } from "@/components/icons";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen">
      <div className="hidden flex-1 flex-col items-center justify-center gap-8 bg-gradient-to-br from-[#eef8f5] via-[#fdf6f0] to-[#fffbea] p-12 lg:flex">
        <Logo variant="stacked" className="h-auto w-80" />
        <p className="max-w-sm text-center text-stone-600">The staff portal for owners and managers.</p>
        <p className="text-xs text-stone-400">Private and secure. Sign-in is protected by two-step verification.</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo variant="stacked" className="h-auto w-48" />
          </div>
          <h1 className="mb-6 font-display text-3xl text-brand-800">{title}</h1>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200/80">{children}</div>
        </div>
      </div>
    </main>
  );
}
