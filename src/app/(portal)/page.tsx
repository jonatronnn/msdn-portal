import Link from "next/link";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { isManager, requireSession, type Session } from "@/lib/auth";
import { formatDate, isCurrentEmployee, todayInLondon, upcomingEvents } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const session = await requireSession();
  return (
    <>
      <PageHeader title={`Hello${session.fullName ? `, ${session.fullName.split(" ")[0]}` : ""}`} />
      {isManager(session) && <ManagerDashboard />}
      <StaffDashboard session={session} />
    </>
  );
}

const typeTone = { birthday: "amber", anniversary: "green", start: "green", leave: "stone" } as const;

async function ManagerDashboard() {
  const supabase = await createClient();
  const today = todayInLondon();
  const [{ data: employees }, { data: tasks }, { data: unsigned }] = await Promise.all([
    supabase.from("employees").select("id, first_name, last_name, date_of_birth, start_date, leave_date"),
    supabase.from("onboarding_tasks").select("employee_id, employees(leave_date)").is("completed_at", null),
    supabase.from("contracts").select("id").eq("status", "sent"),
  ]);
  const events = upcomingEvents(employees ?? [], today, 7);
  const current = (employees ?? []).filter((e) => isCurrentEmployee(e, today)).length;
  const onboarding = new Set(
    (tasks ?? []).filter((t) => t.employees && isCurrentEmployee(t.employees, today)).map((t) => t.employee_id),
  ).size;

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Current staff" value={current} href="/staff" />
        <Stat label="New starters being onboarded" value={onboarding} href="/onboarding" />
        <Stat label="Contracts awaiting signature" value={unsigned?.length ?? 0} href="/staff" />
      </div>
      <Card title="Coming up this week">
        {events.length ? (
          <ul className="divide-y divide-stone-100 text-sm">
            {events.map((e) => (
              <li key={`${e.type}-${e.employeeId}-${e.date}`} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-28 text-stone-500">{e.date === today ? "Today" : formatDate(e.date)}</span>
                <Link href={`/staff/${e.employeeId}`} className="font-medium text-teal-800 hover:underline">
                  {e.name}
                </Link>
                <Badge tone={typeTone[e.type]}>{e.label}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing this week.</Empty>
        )}
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

async function StaffDashboard({ session }: { session: Session }) {
  if (!session.employeeId) return null;
  const supabase = await createClient();
  const [{ data: me }, { data: contracts }, { data: policies }, { data: acks }] = await Promise.all([
    supabase.from("employees").select("starter_form_completed_at").eq("id", session.employeeId).single(),
    supabase.from("contracts").select("id, title").eq("employee_id", session.employeeId).eq("status", "sent"),
    supabase.from("policies").select("id").eq("archived", false).eq("requires_acknowledgement", true),
    supabase.from("policy_acknowledgements").select("policy_id").eq("employee_id", session.employeeId),
  ]);
  const acked = new Set((acks ?? []).map((a) => a.policy_id));
  const toRead = (policies ?? []).filter((p) => !acked.has(p.id)).length;
  const todo = [
    !me?.starter_form_completed_at && { text: "Complete your new starter form", href: "/me" },
    ...(contracts ?? []).map((c) => ({ text: `Sign your contract: ${c.title}`, href: `/contracts/${c.id}` })),
    toRead > 0 && { text: `Read ${toRead} polic${toRead === 1 ? "y" : "ies"} in the handbook`, href: "/handbook" },
  ].filter((t): t is { text: string; href: string } => !!t);

  return (
    <Card title="Your to-do list">
      {todo.length ? (
        <ul className="space-y-2">
          {todo.map((t) => (
            <li key={t.href + t.text} className="flex items-center justify-between gap-4 text-sm">
              {t.text}
              <LinkButton href={t.href}>Go</LinkButton>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>You&apos;re all up to date. Your payslips are under Payslips.</Empty>
      )}
    </Card>
  );
}
