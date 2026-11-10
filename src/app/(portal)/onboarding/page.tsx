import Link from "next/link";
import { Badge, Card, Empty, LinkButton, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, isCurrentEmployee, todayInLondon } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  await requireSession();
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("onboarding_tasks")
    .select("employee_id, completed_at, employees(first_name, last_name, start_date, leave_date, info_form_submitted_at)");

  const today = todayInLondon();
  const byEmployee = new Map<
    string,
    { employee: NonNullable<NonNullable<typeof tasks>[number]["employees"]>; done: number; total: number }
  >();
  for (const t of tasks ?? []) {
    if (!t.employees || !isCurrentEmployee(t.employees, today)) continue;
    const entry = byEmployee.get(t.employee_id) ?? { employee: t.employees, done: 0, total: 0 };
    entry.total += 1;
    if (t.completed_at) entry.done += 1;
    byEmployee.set(t.employee_id, entry);
  }
  const inProgress = [...byEmployee.entries()]
    .filter(([, v]) => v.done < v.total)
    .sort(([, a], [, b]) => (a.employee.start_date ?? "9999").localeCompare(b.employee.start_date ?? "9999"));

  return (
    <>
      <PageHeader title="Onboarding">
        <LinkButton href="/onboarding/new" variant="primary">
          New starter
        </LinkButton>
        <LinkButton href="/staff/import">Import from Famly</LinkButton>
      </PageHeader>
      <Card title="New starters in progress">
        {inProgress.length ? (
          <Table head={["Name", "Start date", "Important information form", "Checklist"]}>
            {inProgress.map(([id, { employee, done, total }]) => (
              <tr key={id}>
                <Td>
                  <Link href={`/staff/${id}`} className="font-medium text-brand-800 hover:underline">
                    {fullName(employee)}
                  </Link>
                </Td>
                <Td>{formatDate(employee.start_date)}</Td>
                <Td>{employee.info_form_submitted_at ? <Badge tone="green">Returned</Badge> : <Badge tone="amber">Waiting</Badge>}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded bg-stone-200">
                      <div className="h-full bg-brand-600" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                    {done}/{total}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No one is being onboarded. Use “New starter” to begin.</Empty>
        )}
      </Card>
    </>
  );
}
