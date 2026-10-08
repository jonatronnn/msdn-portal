import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { isManager, requireSession } from "@/lib/auth";
import { formatDate, isCurrentEmployee, todayInLondon } from "@/lib/dates";
import { MAX_FILE_MB } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { acknowledgePolicy, addPolicy, setPolicyArchived } from "./actions";

export default async function HandbookPage() {
  const session = await requireSession();
  const manager = isManager(session);
  const supabase = await createClient();

  const [{ data: policies }, { data: acks }, { data: employees }] = await Promise.all([
    supabase.from("policies").select("*").order("title"),
    supabase.from("policy_acknowledgements").select("policy_id, employee_id, acknowledged_at"),
    manager ? supabase.from("employees").select("id, leave_date") : Promise.resolve({ data: null }),
  ]);

  const today = todayInLondon();
  const currentStaff = new Set((employees ?? []).filter((e) => isCurrentEmployee(e, today)).map((e) => e.id));
  const live = (policies ?? []).filter((p) => !p.archived);
  const archived = (policies ?? []).filter((p) => p.archived);

  const myAck = (policyId: string) =>
    (acks ?? []).find((a) => a.policy_id === policyId && a.employee_id === session.employeeId)?.acknowledged_at;
  const ackCount = (policyId: string) =>
    (acks ?? []).filter((a) => a.policy_id === policyId && currentStaff.has(a.employee_id)).length;

  return (
    <>
      <PageHeader title="Policies & handbook" />
      <Card>
        {live.length ? (
          <ul className="divide-y divide-stone-100">
            {live.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <a href={`/files/policies/${p.id}`} target="_blank" className="font-medium text-teal-800 hover:underline">
                    {p.title}
                  </a>
                  {p.description && <p className="mt-1 text-sm text-stone-600">{p.description}</p>}
                  {manager && p.requires_acknowledgement && (
                    <p className="mt-1 text-xs text-stone-500">
                      Acknowledged by {ackCount(p.id)} of {currentStaff.size} current staff
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {p.requires_acknowledgement && session.employeeId && (
                    myAck(p.id) ? (
                      <Badge tone="green">Read {formatDate(myAck(p.id))}</Badge>
                    ) : (
                      <ActionForm action={acknowledgePolicy.bind(null, p.id)} submitLabel="I have read and understood this" className="" />
                    )
                  )}
                  {session.role === "admin" && (
                    <form action={setPolicyArchived.bind(null, p.id, true)}>
                      <button className="text-sm text-stone-500 hover:text-red-700 hover:underline">Archive</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No policies have been published yet.</Empty>
        )}
      </Card>

      {session.role === "admin" && (
        <>
          <Card title="Publish a policy">
            <ActionForm action={addPolicy} submitLabel="Publish">
              <Field label="Title">
                <Input name="title" required />
              </Field>
              <Field label="Summary (optional)">
                <Textarea name="description" />
              </Field>
              <Field label="PDF" hint={`Up to ${MAX_FILE_MB}MB. To update a policy, publish the new version and archive the old one.`}>
                <Input name="file" type="file" accept="application/pdf" required />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="requires_acknowledgement" defaultChecked className="h-4 w-4 accent-teal-700" />
                Staff must confirm they have read it
              </label>
            </ActionForm>
          </Card>
          {archived.length > 0 && (
            <Card title="Archived">
              <ul className="divide-y divide-stone-100 text-sm">
                {archived.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <a href={`/files/policies/${p.id}`} target="_blank" className="text-stone-600 hover:underline">
                      {p.title}
                    </a>
                    <form action={setPolicyArchived.bind(null, p.id, false)}>
                      <button className="text-sm text-teal-700 hover:underline">Restore</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
