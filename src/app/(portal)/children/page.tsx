import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { checklistProgress } from "@/lib/children";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { addChildTemplateTask, createChild, removeChildTemplateTask } from "./actions";

export default async function ChildrenPage() {
  const session = await requireSession("admin", "manager");
  const supabase = await createClient();

  const [{ data: children }, { data: templates }] = await Promise.all([
    supabase
      .from("children")
      .select("id, first_name, last_name, provisional_start_date, child_checklist_tasks(title, sort_order, completed_at)")
      .order("provisional_start_date", { nullsFirst: false }),
    supabase.from("child_checklist_templates").select("id, title").eq("active", true).order("sort_order"),
  ]);

  const rows = (children ?? []).map((c) => ({ ...c, progress: checklistProgress(c.child_checklist_tasks) }));
  const inProgress = rows.filter((c) => c.progress.next);
  const complete = rows.filter((c) => !c.progress.next);

  return (
    <>
      <PageHeader title="New children" />
      <Card title="Starters in progress">
        {inProgress.length ? (
          <Table head={["Child", "Provisional start", "Checklist", "Next step"]}>
            {inProgress.map(({ id, progress, ...child }) => (
              <tr key={id}>
                <Td>
                  <Link href={`/children/${id}`} className="font-medium text-teal-800 hover:underline">
                    {fullName(child)}
                  </Link>
                </Td>
                <Td>{formatDate(child.provisional_start_date)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded bg-stone-200">
                      <div className="h-full bg-teal-600" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </div>
                    {progress.done}/{progress.total}
                  </div>
                </Td>
                <Td>{progress.next?.title}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No children are part-way through enrolment.</Empty>
        )}
      </Card>

      <Card title="Add a new child">
        <ActionForm action={createChild} submitLabel="Add child" className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
          <Field label="First name">
            <Input name="first_name" required />
          </Field>
          <Field label="Last name">
            <Input name="last_name" required />
          </Field>
          <Field label="Provisional start date">
            <Input name="provisional_start_date" type="date" />
          </Field>
        </ActionForm>
      </Card>

      {complete.length > 0 && (
        <Card title="Checklist complete">
          <ul className="divide-y divide-stone-100 text-sm">
            {complete.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <Link href={`/children/${c.id}`} className="text-teal-800 hover:underline">
                  {fullName(c)}
                </Link>
                <span className="flex items-center gap-2 text-stone-500">
                  {formatDate(c.provisional_start_date)}
                  <Badge tone="green">Done</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Standard checklist">
        <p className="mb-4 text-sm text-stone-600">
          Every new child starts with these steps, in this order. Changes apply to children added from now on.
        </p>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm">
          {(templates ?? []).map((t) => (
            <li key={t.id}>
              <span className="flex items-center justify-between gap-4">
                {t.title}
                {session.role === "admin" && (
                  <form action={removeChildTemplateTask.bind(null, t.id)}>
                    <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ol>
        {session.role === "admin" && (
          <ActionForm action={addChildTemplateTask} submitLabel="Add to checklist" variant="secondary" className="flex flex-wrap items-end gap-3">
            <div className="min-w-60 flex-1">
              <Field label="New step">
                <Input name="title" required />
              </Field>
            </div>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
