import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Toggle } from "@/components/toggle";
import { Badge, Card, Empty, Field, Input, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { checklistProgress } from "@/lib/children";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import {
  addChildTask,
  deleteChild,
  removeChildTask,
  saveChildTaskNotes,
  setChildTaskDone,
  updateChild,
} from "../actions";

export default async function ChildPage({ params }: PageProps<"/children/[id]">) {
  await requireSession("admin", "manager");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: child }, { data: tasks }] = await Promise.all([
    supabase.from("children").select("*").eq("id", id).maybeSingle(),
    supabase.from("child_checklist_tasks").select("*").eq("child_id", id).order("sort_order").order("title"),
  ]);
  if (!child) notFound();

  const progress = checklistProgress(tasks ?? []);

  return (
    <>
      <PageHeader title={fullName(child)} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {child.provisional_start_date && <Badge>Provisional start {formatDate(child.provisional_start_date)}</Badge>}
        {progress.next ? <Badge tone="amber">Next: {progress.next.title}</Badge> : <Badge tone="green">Checklist complete</Badge>}
      </div>

      <Card title={`Starter checklist${progress.total ? ` (${progress.done}/${progress.total})` : ""}`}>
        {tasks?.length ? (
          <ol className="mb-4 divide-y divide-stone-100">
            {tasks.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <Toggle checked={!!t.completed_at} action={setChildTaskDone.bind(null, id, t.id)}>
                    {t.title}
                    {t.id === progress.next?.id && (
                      <>
                        {" "}
                        <Badge tone="amber">Next</Badge>
                      </>
                    )}
                    {t.completed_at && (
                      <span className="text-stone-500">
                        {" "}
                        · {t.completed_by_name} · {formatDate(t.completed_at)}
                      </span>
                    )}
                  </Toggle>
                  <form action={removeChildTask.bind(null, id, t.id)}>
                    <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                  </form>
                </div>
                <ActionForm
                  action={saveChildTaskNotes.bind(null, id, t.id)}
                  submitLabel="Save note"
                  variant="secondary"
                  className="mt-2 flex flex-wrap items-center gap-2 pl-6"
                >
                  <div className="min-w-60 flex-1">
                    <Input name="notes" defaultValue={t.notes ?? ""} placeholder="Notes" aria-label={`Notes for ${t.title}`} />
                  </div>
                </ActionForm>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mb-4">
            <Empty>No checklist steps.</Empty>
          </div>
        )}
        <ActionForm action={addChildTask.bind(null, id)} submitLabel="Add step" variant="secondary" className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1">
            <Field label="Extra step for this child">
              <Input name="title" required />
            </Field>
          </div>
        </ActionForm>
      </Card>

      <Card title="Details">
        <ActionForm action={updateChild.bind(null, id)} submitLabel="Save details" variant="secondary" className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
          <Field label="First name">
            <Input name="first_name" defaultValue={child.first_name} required />
          </Field>
          <Field label="Last name">
            <Input name="last_name" defaultValue={child.last_name} required />
          </Field>
          <Field label="Provisional start date">
            <Input name="provisional_start_date" type="date" defaultValue={child.provisional_start_date ?? ""} />
          </Field>
        </ActionForm>
      </Card>

      <ActionForm
        action={deleteChild.bind(null, id)}
        submitLabel="Delete this child"
        variant="danger"
        confirm={`Delete ${fullName(child)} and their checklist? This can't be undone.`}
      />

      <p className="mt-6 text-xs text-stone-400">Added {formatDate(child.created_at)}</p>
    </>
  );
}
