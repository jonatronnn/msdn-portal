import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Badge, buttonClass, Card, Empty, PageHeader, Table, Td } from "@/components/ui";
import { isOwner, requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { BANK_HOLIDAYS, decimalHours, formatMinutes, isMonthKey, monthDates, monthLabel, MONTH_NAMES, WAGE_GRID } from "@/lib/wages";
import { loadWageMonth } from "@/lib/wages-server";
import { addClosureDay, deleteMonth, refreshMonth, removeClosureDay, setMonthStatus, startMonth } from "../actions";
import { WageRow } from "../wage-row";

const STATUS = {
  open: { label: "Open", tone: "amber" },
  finalised: { label: "Finalised", tone: "green" },
  archived: { label: "Archived", tone: "stone" },
} as const;

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });
}

export default async function WageMonthPage({ params }: PageProps<"/wages/[month]">) {
  const session = await requireSession("admin", "manager");
  const owner = isOwner(session);
  const { month: key } = await params;
  if (!isMonthKey(key)) notFound();

  const year = Number(key.slice(0, 4));
  const monthNumber = key.slice(5);
  const supabase = await createClient();
  const [{ data: yearMonths }, { month, staff, closureDays }] = await Promise.all([
    supabase.from("wage_months").select("month, status").gte("month", `${year}-01-01`).lte("month", `${year}-12-01`),
    loadWageMonth(supabase, key),
  ]);
  const statusOf = new Map((yearMonths ?? []).map((m) => [m.month.slice(0, 7), m.status as keyof typeof STATUS]));
  const editable = month?.status === "open";
  const dates = monthDates(key);
  const bankHolidays = dates.filter((d) => BANK_HOLIDAYS.has(d));
  const closures = new Set(closureDays);

  return (
    <>
      <PageHeader title="Wages" />

      <div className="mb-4 flex items-center gap-3">
        <Link href={`/wages/${year - 1}-${monthNumber}`} className="text-sm text-brand-700 hover:underline" aria-label="Previous year">
          ‹ {year - 1}
        </Link>
        <h2 className="text-xl font-bold text-brand-800">{year}</h2>
        <Link href={`/wages/${year + 1}-${monthNumber}`} className="text-sm text-brand-700 hover:underline" aria-label="Next year">
          {year + 1} ›
        </Link>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-stone-200" aria-label="Months">
        {MONTH_NAMES.map((name, i) => {
          const tabKey = `${year}-${String(i + 1).padStart(2, "0")}`;
          const status = statusOf.get(tabKey);
          const active = tabKey === key;
          return (
            <Link
              key={tabKey}
              href={`/wages/${tabKey}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center gap-1.5 rounded-t-lg border px-3 py-2 text-sm ${
                active ? "border-stone-200 border-b-white bg-white font-semibold text-brand-800" : "border-transparent text-stone-600 hover:text-brand-800"
              }`}
            >
              {name}
              {status && (
                <span
                  title={STATUS[status].label}
                  className={`h-2 w-2 rounded-full ${status === "open" ? "bg-amber-500" : status === "finalised" ? "bg-emerald-600" : "bg-stone-400"}`}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {!month ? (
        <Card title={monthLabel(key)}>
          <p className="mb-4 text-sm text-stone-600">
            This month hasn&apos;t been started. Starting it adds everyone employed during the month, with their contracted hours from their shift patterns.
          </p>
          <ActionForm action={startMonth.bind(null, key)} submitLabel={`Start ${monthLabel(key)}`} className="" />
        </Card>
      ) : (
        <>
          <Card
            title={monthLabel(key)}
            actions={<Badge tone={STATUS[month.status as keyof typeof STATUS].tone}>{STATUS[month.status as keyof typeof STATUS].label}</Badge>}
          >
            <p className="mb-4 text-sm text-stone-600">
              Started{month.started_by_name && ` by ${month.started_by_name}`} on {formatTimestamp(month.created_at)}.
              {month.finalised_at && ` Finalised by ${month.finalised_by_name} on ${formatTimestamp(month.finalised_at)}.`}
              {month.archived_at && ` Archived by ${month.archived_by_name} on ${formatTimestamp(month.archived_at)}.`}
              {editable && !owner && " The owner finalises the month once it's complete."}
            </p>
            {owner && (
              <div className="flex flex-wrap gap-3">
                {month.status === "open" && (
                  <>
                    <ActionForm
                      action={setMonthStatus.bind(null, key, "finalised")}
                      submitLabel="Finalise for payroll"
                      className=""
                      confirm="Finalise this month? It will be locked so the figures can go into QuickBooks."
                    />
                    <ActionForm
                      action={deleteMonth.bind(null, key)}
                      submitLabel="Delete month"
                      variant="danger"
                      className=""
                      confirm="Delete this month and everything entered in it?"
                    />
                  </>
                )}
                {month.status === "finalised" && (
                  <>
                    <ActionForm
                      action={setMonthStatus.bind(null, key, "archived")}
                      submitLabel="Archive (payroll done)"
                      className=""
                      confirm="Archive this month? It can't be changed or reopened afterwards."
                    />
                    <ActionForm action={setMonthStatus.bind(null, key, "open")} submitLabel="Reopen" variant="secondary" className="" />
                  </>
                )}
              </div>
            )}
          </Card>

          <Card title="Closure days">
            <p className="mb-3 text-sm text-stone-600">
              Bank holidays count as holiday hours automatically. Add any other days the nursery is closed, then choose for each person whether they
              take them as holiday or unpaid.
            </p>
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              {bankHolidays.map((d) => (
                <Badge key={d}>{formatDate(d)} · bank holiday</Badge>
              ))}
              {closureDays.map((d) => (
                <span key={d} className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                  {formatDate(d)} · closed
                  {editable && (
                    <form action={removeClosureDay.bind(null, key, d)}>
                      <button className="hover:text-red-700" aria-label={`Remove ${formatDate(d)}`}>
                        ×
                      </button>
                    </form>
                  )}
                </span>
              ))}
              {!bankHolidays.length && !closureDays.length && <span className="text-stone-500">None this month.</span>}
            </div>
            {editable && (
              <ActionForm action={addClosureDay.bind(null, key)} submitLabel="Add closure day" variant="secondary" className="flex flex-wrap items-center gap-2">
                <input type="date" name="date" min={dates[0]} max={dates[dates.length - 1]} required aria-label="Closure date" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              </ActionForm>
            )}
          </Card>

          <Card
            title="Staff"
            actions={
              editable && <ActionForm action={refreshMonth.bind(null, key)} submitLabel="Refresh from staff records" variant="secondary" className="flex items-center gap-3" />
            }
          >
            {staff.length ? (
              <div className="xl:overflow-x-auto">
                <div className={`hidden gap-3 border-b border-stone-200 pb-2 text-xs font-medium uppercase tracking-wide text-stone-500 xl:grid xl:min-w-max ${WAGE_GRID}`}>
                  <span className="xl:sticky xl:left-0 xl:z-10 xl:bg-white">Staff member and totals</span>
                  <span>Extra minutes</span>
                  <span>Sick hours</span>
                  <span>Sick days (SSP)</span>
                  <span>Holiday days</span>
                  <span>Overtime</span>
                  <span>Closure days</span>
                </div>
                {staff.map((r) => {
                  const e = r.employees;
                  const notes = [];
                  if (e.start_date?.startsWith(key)) notes.push(`Started ${formatDate(e.start_date)}`);
                  if (e.leave_date?.startsWith(key)) notes.push(`Left ${formatDate(e.leave_date)}`);
                  return (
                    <WageRow
                      key={r.id}
                      monthKey={key}
                      id={r.id}
                      name={fullName(e)}
                      notes={notes}
                      noPattern={!Object.keys(r.contracted).length}
                      contracted={r.totals.contracted}
                      extraMinutes={r.extra_minutes}
                      overtimeMinutes={r.overtime_minutes}
                      closureAsHoliday={r.closure_as_holiday}
                      hasClosureDays={Object.keys(r.contracted).some((d) => closures.has(d))}
                      entries={r.entries}
                      totals={r.totals}
                      editable={editable}
                    />
                  );
                })}
              </div>
            ) : (
              <Empty>No one was employed this month.</Empty>
            )}
          </Card>

          <Card
            title="For QuickBooks"
            actions={
              <a href={`/wages/${key}/csv`} className={buttonClass("secondary")}>
                Download CSV
              </a>
            }
          >
            <Table head={["Staff member", "Payroll ID", "Hours worked", "Holiday hours", "SSP days", "Overtime hours"]}>
              {staff.map((r) => (
                <tr key={r.id}>
                  <Td>{fullName(r.employees)}</Td>
                  <Td>{r.employees.payroll_id}</Td>
                  <Td>
                    {decimalHours(r.totals.worked)} <span className="text-stone-500">({formatMinutes(r.totals.worked)})</span>
                  </Td>
                  <Td>{decimalHours(r.totals.holiday)}</Td>
                  <Td>
                    {r.totals.sickDays.length}
                    {r.totals.sickDays.length > 0 && <span className="text-stone-500"> ({r.totals.sickDays.map((d) => formatDate(d)).join(", ")})</span>}
                  </Td>
                  <Td>{decimalHours(r.totals.overtime)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
