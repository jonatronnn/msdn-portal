import type { ReactNode } from "react";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-center text-sm font-medium text-teal-700">Montagu Square Day Nursery</p>
        <h1 className="mb-6 text-center text-2xl font-semibold">{title}</h1>
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
