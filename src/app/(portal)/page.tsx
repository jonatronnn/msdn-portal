import Link from "next/link";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { addDays, formatDate, formatTimeUntil, isCurrentEmployee, nextMilestone, todayInLondon } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { EmailList } from "./email-list";

// How far ahead the dashboard looks for anniversaries and expiring training.
const LOOKAHEAD_DAYS = 60;

export default async function Dashboard() {
  const session = await requireSession();
  const supabase = await createClient();
  const today = todayInLondon();
  const horizon = addDays(today, LOOKAHEAD_DAYS);

  const [{ data: employees }, { data: openTasks }, { data: training }] = await Promise.all([
    supabase.from("employees").select("id, first_name, last_name, email, start_date, leave_date").order("last_name").order("first_name"),
    supabase.from("onboarding_tasks").select("employee_id").is("completed_at", null),
    supabase
      .from("employee_training")
      .select("id, employee_id, expires_on, training_types(name)")
      .lte("expires_on", horizon)
      .order("expires_on"),
  ]);

  const current = (employees ?? []).filter((e) => isCurrentEmployee(e, today));
  const currentIds = new Set(current.map((e) => e.id));
  const names = new Map(current.map((e) => [e.id, fullName(e)]));
  const onboarding = new Set((openTasks ?? []).map((t) => t.employee_id).filter((id) => currentIds.has(id))).size;

  const anniversaries = current
    .flatMap((e) => {
      const m = e.start_date ? nextMilestone(e.start_date, today) : null;
      return m && m.date <= horizon ? [{ id: e.id, name: fullName(e), ...m }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Only the latest record of each kind of training per person matters.
  const latest = new Map<string, NonNullable<typeof training>[number]>();
  for (const t of training ?? []) {
    if (!currentIds.has(t.employee_id)) continue;
    latest.set(`${t.employee_id}:${t.training_types?.name}`, t);
  }
  const { data: renewed } = await supabase
    .from("employee_training")
    .select("employee_id, training_types(name)")
    .gt("expires_on", horizon);
  const renewedKeys = new Set((renewed ?? []).map((r) => `${r.employee_id}:${r.training_types?.name}`));
  const expiring = [...latest.entries()].filter(([key]) => !renewedKeys.has(key)).map(([, t]) => t);

  return (
    <>
      <PageHeader title={`Hello${session.fullName ? `, ${session.fullName.split(" ")[0]}` : ""}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Current staff" value={current.length} href="/staff" />
        <Stat label="New starters being onboarded" value={onboarding} href="/onboarding" />
        <Stat label="Training expired or expiring soon" value={expiring.length} href="#training" />
      </div>

      <Card title={`Major work anniversaries in the next ${LOOKAHEAD_DAYS} days`}>
        {anniversaries.length ? (
          <ul className="divide-y divide-stone-100 text-sm">
            {anniversaries.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-28 text-stone-500">{formatDate(a.date)}</span>
                <Link href={`/staff/${a.id}`} className="font-medium text-teal-800 hover:underline">
                  {a.name}
                </Link>
                <Badge tone="green">
                  {a.years} year{a.years === 1 ? "" : "s"}
                </Badge>
                <span className="text-stone-500">{formatTimeUntil(today, a.date)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>None coming up.</Empty>
        )}
      </Card>

      <section id="training">
        <Card title="Training to renew">
          {expiring.length ? (
            <ul className="divide-y divide-stone-100 text-sm">
              {expiring.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Link href={`/staff/${t.employee_id}`} className="font-medium text-teal-800 hover:underline">
                    {names.get(t.employee_id)}
                  </Link>
                  <span>{t.training_types?.name}</span>
                  {t.expires_on! < today ? (
                    <Badge tone="red">Expired {formatDate(t.expires_on)}</Badge>
                  ) : (
                    <Badge tone="amber">
                      Expires {formatDate(t.expires_on)} ({formatTimeUntil(today, t.expires_on!)})
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>All recorded training is in date for the next {LOOKAHEAD_DAYS} days.</Empty>
          )}
        </Card>
      </section>

      <Card title="Email list">
        <EmailList staff={current.map((e) => ({ id: e.id, name: fullName(e), email: e.email }))} />
      </Card>
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-teal-600">
      <p className="text-3xl font-semibold text-teal-800">{value}</p>
      <p className="text-sm text-stone-600">{label}</p>
    </Link>
  );
}
