import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Toggle } from "@/components/toggle";
import { Badge, Card, DetailList, Empty, Field, Input, LinkButton, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, formatLengthOfService, isCurrentEmployee, todayInLondon } from "@/lib/dates";
import { formatAddress, fullName } from "@/lib/staff";
import { MAX_FILE_MB } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  addQualification,
  addTask,
  inviteEmployee,
  removeQualification,
  removeTask,
  sendContract,
  setPolicyAcknowledged,
  setTaskDone,
  uploadSignedContract,
  voidContract,
} from "../actions";

export default async function EmployeePage({ params }: PageProps<"/staff/[id]">) {
  const session = await requireSession("admin", "manager");
  const { id } = await params;
  const today = todayInLondon();
  const supabase = await createClient();

  const { data: e } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();

  const [{ data: qualifications }, { data: contracts }, { data: policies }, { data: acks }, { data: tasks }, { data: payslips }] =
    await Promise.all([
      supabase.from("employee_qualifications").select("*").eq("employee_id", id).order("achieved_on"),
      supabase.from("contracts").select("*").eq("employee_id", id).order("created_at", { ascending: false }),
      supabase.from("policies").select("id, title").eq("archived", false).eq("requires_acknowledgement", true).order("title"),
      supabase.from("policy_acknowledgements").select("policy_id, acknowledged_at").eq("employee_id", id),
      supabase.from("onboarding_tasks").select("*").eq("employee_id", id).order("sort_order").order("title"),
      session.role === "admin"
        ? supabase.from("payslips").select("id, pay_date, file_name").eq("employee_id", id).order("pay_date", { ascending: false })
        : Promise.resolve({ data: null }),
    ]);

  const ackedOn = new Map((acks ?? []).map((a) => [a.policy_id, a.acknowledged_at]));
  const doneTasks = (tasks ?? []).filter((t) => t.completed_at).length;

  return (
    <>
      <PageHeader title={fullName(e)}>
        <LinkButton href={`/staff/${id}/edit`} variant="primary">
          Edit details
        </LinkButton>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {isCurrentEmployee(e, today) ? <Badge tone="green">Current staff</Badge> : <Badge>Left</Badge>}
        {e.profile_id ? <Badge tone="green">Has portal account</Badge> : <Badge tone="amber">No portal account</Badge>}
        {e.starter_form_completed_at && <Badge>Starter form completed {formatDate(e.starter_form_completed_at)}</Badge>}
        {!e.profile_id && (
          <ActionForm action={inviteEmployee.bind(null, id)} submitLabel="Invite to portal" variant="secondary" className="" />
        )}
      </div>

      <Card title="Personal details">
        <DetailList
          items={[
            ["Date of birth", formatDate(e.date_of_birth)],
            ["Email", e.email],
            ["Mobile", e.mobile_phone],
            ["Home phone", e.home_phone],
            ["Home address", formatAddress(e)],
          ]}
        />
      </Card>

      <Card title="Employment">
        <DetailList
          items={[
            ["Job title", e.job_title],
            ["Employee ID", e.employee_number],
            ["Payroll ID", e.payroll_id],
            ["Start date", formatDate(e.start_date)],
            ["Length of service", formatLengthOfService(e.start_date, e.leave_date, today)],
            ["Leave date", formatDate(e.leave_date)],
            ["Leave reason", e.leave_reason],
          ]}
        />
      </Card>

      <Card title="Qualifications">
        <p className="mb-3 text-sm">
          <span className="text-stone-500">Qualification level:</span> {e.qualification_level ?? "Not recorded"}
        </p>
        {qualifications?.length ? (
          <ul className="mb-4 divide-y divide-stone-100 text-sm">
            {qualifications.map((q) => (
              <li key={q.id} className="flex items-center justify-between py-2">
                <span>
                  {q.name}
                  {q.achieved_on && <span className="text-stone-500"> · {formatDate(q.achieved_on)}</span>}
                </span>
                <form action={removeQualification.bind(null, id, q.id)}>
                  <button className="text-sm text-red-700 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mb-4">
            <Empty>No other qualifications recorded.</Empty>
          </div>
        )}
        <ActionForm action={addQualification.bind(null, id)} submitLabel="Add qualification" variant="secondary" className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <Field label="Other qualification">
            <Input name="name" placeholder="e.g. Paediatric first aid" required />
          </Field>
          <Field label="Achieved on">
            <Input name="achieved_on" type="date" />
          </Field>
        </ActionForm>
      </Card>

      <Card title="Contracts">
        {contracts?.length ? (
          <div className="mb-6">
            <Table head={["Contract", "Status", "Details", ""]}>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <a href={`/files/contracts/${c.id}`} target="_blank" className="text-teal-800 hover:underline">
                      {c.title}
                    </a>
                  </Td>
                  <Td>
                    {c.status === "signed" ? (
                      <Badge tone="green">Signed</Badge>
                    ) : c.status === "sent" ? (
                      <Badge tone="amber">Awaiting signature</Badge>
                    ) : (
                      <Badge>Withdrawn</Badge>
                    )}
                  </Td>
                  <Td className="text-xs text-stone-600">
                    {c.status === "signed" && c.uploaded_signed && <>Signed copy uploaded · {formatDate(c.signed_at)}</>}
                    {c.status === "signed" && !c.uploaded_signed && (
                      <>
                        Signed electronically by “{c.signed_name}” on{" "}
                        {new Date(c.signed_at!).toLocaleString("en-GB", { timeZone: "Europe/London" })}
                        <br />
                        IP {c.signed_ip} · document SHA-256 {c.sha256.slice(0, 12)}…
                      </>
                    )}
                    {c.status === "sent" && <>Sent {formatDate(c.sent_at)}</>}
                  </Td>
                  <Td>
                    {c.status === "sent" && (
                      <form action={voidContract.bind(null, id, c.id)}>
                        <button className="text-sm text-red-700 hover:underline">Withdraw</button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        ) : (
          <div className="mb-6">
            <Empty>No contracts yet.</Empty>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-medium">Send a contract to sign</h3>
            <ActionForm action={sendContract.bind(null, id)} submitLabel="Send for signature">
              <Field label="Title">
                <Input name="title" defaultValue="Contract of employment" required />
              </Field>
              <Field label="Contract PDF" hint={`Up to ${MAX_FILE_MB}MB.`}>
                <Input name="file" type="file" accept="application/pdf" required />
              </Field>
            </ActionForm>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Store an already-signed contract</h3>
            <ActionForm action={uploadSignedContract.bind(null, id)} submitLabel="Upload signed copy" variant="secondary">
              <Field label="Title">
                <Input name="title" defaultValue="Contract of employment" required />
              </Field>
              <Field label="Date signed">
                <Input name="signed_on" type="date" />
              </Field>
              <Field label="Signed PDF" hint={`Up to ${MAX_FILE_MB}MB.`}>
                <Input name="file" type="file" accept="application/pdf" required />
              </Field>
            </ActionForm>
          </div>
        </div>
      </Card>

      <Card title="Policy acknowledgements">
        {policies?.length ? (
          <div className="space-y-2">
            {policies.map((p) => (
              <Toggle key={p.id} checked={ackedOn.has(p.id)} action={setPolicyAcknowledged.bind(null, id, p.id)}>
                {p.title}
                {ackedOn.get(p.id) && <span className="text-stone-500"> · {formatDate(ackedOn.get(p.id))}</span>}
              </Toggle>
            ))}
          </div>
        ) : (
          <Empty>No policies need acknowledging. Add them under Policies &amp; handbook.</Empty>
        )}
      </Card>

      <Card title={`Onboarding checklist${tasks?.length ? ` (${doneTasks}/${tasks.length})` : ""}`}>
        {tasks?.length ? (
          <ul className="mb-4 space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4">
                <Toggle checked={!!t.completed_at} action={setTaskDone.bind(null, id, t.id)}>
                  {t.title}
                  {t.completed_at && <span className="text-stone-500"> · {formatDate(t.completed_at)}</span>}
                </Toggle>
                <form action={removeTask.bind(null, id, t.id)}>
                  <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mb-4">
            <Empty>No onboarding tasks.</Empty>
          </div>
        )}
        <ActionForm action={addTask.bind(null, id)} submitLabel="Add task" variant="secondary" className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1">
            <Field label="Extra task for this employee">
              <Input name="title" required />
            </Field>
          </div>
        </ActionForm>
      </Card>

      {payslips && (
        <Card title="Payslips">
          {payslips.length ? (
            <ul className="divide-y divide-stone-100 text-sm">
              {payslips.map((p) => (
                <li key={p.id} className="py-2">
                  <a href={`/files/payslips/${p.id}`} target="_blank" className="text-teal-800 hover:underline">
                    {formatDate(p.pay_date)}
                  </a>{" "}
                  <span className="text-stone-500">· {p.file_name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No payslips uploaded.</Empty>
          )}
        </Card>
      )}

      <p className="text-xs text-stone-400">
        Record created {formatDate(e.created_at)} · last updated {formatDate(e.updated_at)}
      </p>
    </>
  );
}
