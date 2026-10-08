import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, isCurrentEmployee, todayInLondon } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { addTemplateTask, removeTemplateTask } from "./actions";

export default async function OnboardingPage() {
  const session = await requireSession("admin", "manager");
  const supabase = await createClient();

  const [{ data: tasks }, { data: templates }] = await Promise.all([
    supabase
      .from("onboarding_tasks")
      .select("employee_id, completed_at, employees(first_name, last_name, start_date, leave_date, starter_form_completed_at, profile_id)"),
    supabase.from("onboarding_task_templates").select("id, title").eq("active", true).order("sort_order"),
  ]);

  const byEmployee = new Map<string, { employee: NonNullable<NonNullable<typeof tasks>[number]["employees"]>; done: number; total: number }>();
  const today = todayInLondon();
  for (const t of tasks ?? []) {
    if (!t.employees || !isCurrentEmployee(t.employees, today)) continue;
    const entry = byEmployee.get(t.employee_id) ?? { employee: t.employees, done: 0, total: 0 };
    entry.total += 1;
    if (t.completed_at) entry.done += 1;
    byEmployee.set(t.employee_id, entry);
  }
  const inProgress = [...byEmployee.entries()]
    .filter(([, v]) => v.done < v.total)
    .sort(([, a], [, b]) => (a.employee.start_date ?? "").localeCompare(b.employee.start_date ?? ""));

  return (
    <>
      <PageHeader title="Onboarding" />
      <Card title="New starters in progress">
        {inProgress.length ? (
          <Table head={["Name", "Start date", "Portal account", "Starter form", "Checklist"]}>
            {inProgress.map(([id, { employee, done, total }]) => (
              <tr key={id}>
                <Td>
                  <Link href={`/staff/${id}`} className="font-medium text-teal-800 hover:underline">
                    {fullName(employee)}
                  </Link>
                </Td>
                <Td>{formatDate(employee.start_date)}</Td>
                <Td>{employee.profile_id ? <Badge tone="green">Invited</Badge> : <Badge tone="amber">Not invited</Badge>}</Td>
                <Td>
                  {employee.starter_form_completed_at ? <Badge tone="green">Completed</Badge> : <Badge tone="amber">Waiting</Badge>}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded bg-stone-200">
                      <div className="h-full bg-teal-600" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                    {done}/{total}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>Everyone&apos;s onboarding is complete.</Empty>
        )}
      </Card>

      <Card title="Standard checklist">
        <p className="mb-4 text-sm text-stone-600">
          Every new employee record starts with these tasks. Changes apply to employees added from now on.
        </p>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm">
          {(templates ?? []).map((t) => (
            <li key={t.id}>
              <span className="flex items-center justify-between gap-4">
                {t.title}
                {session.role === "admin" && (
                  <form action={removeTemplateTask.bind(null, t.id)}>
                    <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ol>
        {session.role === "admin" && (
          <ActionForm action={addTemplateTask} submitLabel="Add to checklist" variant="secondary" className="flex flex-wrap items-end gap-3">
            <div className="min-w-60 flex-1">
              <Field label="New task">
                <Input name="title" required />
              </Field>
            </div>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
