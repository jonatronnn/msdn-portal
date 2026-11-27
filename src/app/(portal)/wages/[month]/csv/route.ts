import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { decimalHours, isMonthKey } from "@/lib/wages";
import { loadWageMonth } from "@/lib/wages-server";

const cell = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;

// The month's figures as a CSV, for entering into QuickBooks.
export async function GET(_: Request, ctx: RouteContext<"/wages/[month]/csv">) {
  await requireSession("admin", "manager");
  const { month: key } = await ctx.params;
  if (!isMonthKey(key)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { month, staff } = await loadWageMonth(supabase, key);
  if (!month) return new NextResponse("Not found", { status: 404 });

  const lines = [
    ["Staff member", "Employee ID", "Hours worked", "Holiday hours", "SSP days", "SSP dates", "Overtime hours"],
    ...staff.map((r) => [
      fullName(r.employees),
      r.employees.payroll_id,
      decimalHours(r.totals.worked),
      decimalHours(r.totals.holiday),
      r.totals.sickDays.length,
      r.totals.sickDays.join(" "),
      decimalHours(r.totals.overtime),
    ]),
  ];
  return new NextResponse(lines.map((l) => l.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wages-${key}.csv"`,
    },
  });
}
