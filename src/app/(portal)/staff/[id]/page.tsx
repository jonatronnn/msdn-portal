import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Toggle } from "@/components/toggle";
import { Badge, Card, DetailList, Empty, Field, Input, LinkButton, PageHeader, Select, Table, Td, Textarea } from "@/components/ui";
import { isOwner, requireSession } from "@/lib/auth";
import { decryptJson } from "@/lib/crypto";
import { addDays, formatDate, formatLengthOfService, formatTimeUntil, isCurrentEmployee, nextMilestone, todayInLondon } from "@/lib/dates";
import { env } from "@/lib/env";
import { type BankDetails, formatAddress, formatNiNumber, formatPay, formatSortCode, fullName, missingEmploymentDetails } from "@/lib/staff";
import { MAX_FILE_MB } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  addTask,
  addTraining,
  endEmployment,
  reinstateEmployee,
  removeContract,
  removeTask,
  removeTraining,
  saveBankDetails,
  sendStarterFormAction,
  setTaskDone,
  uploadContract,
} from "../actions";
import { FamlyCard } from "../famly-card";

// Training expiring within this many days is flagged.
const EXPIRY_WARNING_DAYS = 60;

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });
}

export default async function EmployeePage({ params }: PageProps<"/staff/[id]">) {
  const session = await requireSession();
  const owner = isOwner(session);
  const { id } = await params;
  const today = todayInLondon();
  const supabase = await createClient();

  const { data: e } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();

  const [{ data: links }, { data: training }, { data: trainingTypes }, { data: contracts }, { data: tasks }, { data: bank }] =
    await Promise.all([
      supabase.from("starter_form_links").select("*").eq("employee_id", id).order("sent_at", { ascending: false }).limit(1),
      supabase
        .from("employee_training")
        .select("id, completed_on, expires_on, recorded_by_name, training_types(name)")
        .eq("employee_id", id)
        .order("expires_on", { ascending: true, nullsFirst: false }),
      supabase.from("training_types").select("id, name").eq("active", true).order("name"),
      supabase.from("contracts").select("*").eq("employee_id", id).order("uploaded_at", { ascending: false }),
      supabase.from("onboarding_tasks").select("*").eq("employee_id", id).order("sort_order").order("title"),
      owner
        ? supabase.from("employee_bank_details").select("*").eq("employee_id", id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const current = isCurrentEmployee(e, today);
  const missing = missingEmploymentDetails(e);
  const milestone = current && e.start_date ? nextMilestone(e.start_date, today) : null;
  const link = links?.[0];
  const linkActive = link && !link.used_at && !link.revoked_at && link.expires_at > new Date().toISOString();
  const doneTasks = (tasks ?? []).filter((t) => t.completed_at).length;

  let bankDetails: BankDetails | null = null;
  let bankError = false;
  if (bank) {
    try {
      bankDetails = decryptJson<BankDetails>(bank.encrypted, env.bankDetailsKey());
    } catch (err) {
      console.error(err);
      bankError = true;
    }
  }

  return (
    <>
      <PageHeader title={fullName(e)}>
        <LinkButton href={`/staff/${id}/edit`} variant="primary">
          Edit details
        </LinkButton>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {!current ? (
          <Badge>Archived · left {formatDate(e.leave_date)}</Badge>
        ) : e.leave_date ? (
          <Badge tone="amber">Leaving {formatDate(e.leave_date)}</Badge>
        ) : (
          <Badge tone="green">Current staff</Badge>
        )}
        {tasks && tasks.length > 0 && (
          <Badge tone={doneTasks === tasks.length ? "green" : "amber"}>
            Onboarding {doneTasks}/{tasks.length}
          </Badge>
        )}
      </div>
      {missing.length > 0 && (
        <p className="mb-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Still to add: {missing.join(", ")}.</p>
      )}

      <Card title="Important information form">
        <p className="mb-4 text-sm">
          {e.info_form_submitted_at ? (
            <>Returned {formatTimestamp(e.info_form_submitted_at)}.</>
          ) : linkActive ? (
            <>
              Sent to {link.sent_to} on {formatTimestamp(link.sent_at)} by {link.sent_by_name}. The link expires{" "}
              {formatDate(link.expires_at.slice(0, 10))}.
            </>
          ) : link ? (
            <>The last link has expired or was replaced. Send a new one.</>
          ) : (
            <>Not sent yet. It asks for their personal details, emergency contact, NI number and bank details.</>
          )}
        </p>
        <ActionForm
          action={sendStarterFormAction.bind(null, id)}
          submitLabel={link ? "Send a new link" : "Send form"}
          variant="secondary"
          className=""
          confirm={linkActive ? "The link already sent will stop working. Send a new one?" : undefined}
        />
      </Card>

      <Card title="Employment">
        <DetailList
          items={[
            ["Job title", e.job_title],
            ["Start date", formatDate(e.start_date)],
            ["Length of service", formatLengthOfService(e.start_date, e.leave_date, today)],
            [
              "Next major anniversary",
              milestone &&
                `${milestone.years} yr${milestone.years === 1 ? "" : "s"} on ${formatDate(milestone.date)} (${formatTimeUntil(today, milestone.date)})`,
            ],
            ["Contract type", e.contract_type],
            ["Contract end date", formatDate(e.contract_end_date)],
            ["Notice period", e.notice_period],
            ["Probation ends", formatDate(e.probation_end_date)],
            ["Working pattern", e.working_pattern],
            ["Contracted hours", e.contracted_hours != null && `${e.contracted_hours} per week`],
            ["Pay rate", formatPay(e.pay_rate, e.pay_rate_basis)],
            [
              "Qualification",
              e.qualification_level && [e.qualification_level, formatDate(e.qualification_date)].filter(Boolean).join(", "),
            ],
            ["Payroll reference", e.payroll_id],
          ]}
        />
      </Card>

      <Card title="Personal details">
        <DetailList
          items={[
            ["Email", e.email],
            ["Mobile", e.mobile_phone],
            ["Date of birth", formatDate(e.date_of_birth)],
            ["National Insurance number", formatNiNumber(e.ni_number)],
            ["Home address", formatAddress(e)],
            [
              "Emergency contact",
              e.emergency_contact_name &&
                `${e.emergency_contact_name}${e.emergency_contact_relationship ? ` (${e.emergency_contact_relationship})` : ""}, ${e.emergency_contact_phone ?? ""}`,
            ],
          ]}
        />
      </Card>

      <Card title="Bank details">
        {!owner ? (
          <p className="text-sm text-stone-600">
            {e.bank_details_received_at
              ? `On file since ${formatDate(e.bank_details_received_at.slice(0, 10))}. Only the owner can view them.`
              : "Not provided yet. They're collected on the Important information form."}
          </p>
        ) : (
          <>
            {bankError && <p className="mb-4 text-sm text-red-700">These bank details can&apos;t be read. Check BANK_DETAILS_KEY.</p>}
            {bankDetails && bank ? (
              <div className="mb-4">
                <DetailList
                  items={[
                    ["Name on account", bankDetails.accountName],
                    ["Sort code", formatSortCode(bankDetails.sortCode)],
                    ["Account number", bankDetails.accountNumber],
                  ]}
                />
                <p className="mt-2 text-xs text-stone-500">
                  Last updated {formatTimestamp(bank.updated_at)}
                  {bank.updated_by_name && ` by ${bank.updated_by_name}`}.
                </p>
              </div>
            ) : (
              !bankError && <p className="mb-4 text-sm text-stone-600">Not provided yet.</p>
            )}
            <details>
              <summary className="cursor-pointer text-sm text-brand-700">{bankDetails ? "Change bank details" : "Enter bank details"}</summary>
              <ActionForm action={saveBankDetails.bind(null, id)} submitLabel="Save bank details" className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Name on account">
                  <Input name="account_name" required autoComplete="off" />
                </Field>
                <Field label="Sort code">
                  <Input name="sort_code" required inputMode="numeric" autoComplete="off" placeholder="12-34-56" />
                </Field>
                <Field label="Account number">
                  <Input name="account_number" required inputMode="numeric" autoComplete="off" />
                </Field>
              </ActionForm>
            </details>
          </>
        )}
      </Card>

      <Card title="Training">
        {training?.length ? (
          <div className="mb-6">
            <Table head={["Training", "Completed", "Expires", "", ""]}>
              {training.map((t) => (
                <tr key={t.id}>
                  <Td>{t.training_types?.name}</Td>
                  <Td>{formatDate(t.completed_on)}</Td>
                  <Td>{formatDate(t.expires_on)}</Td>
                  <Td>
                    {t.expires_on &&
                      (t.expires_on < today ? (
                        <Badge tone="red">Expired</Badge>
                      ) : t.expires_on <= addDays(today, EXPIRY_WARNING_DAYS) ? (
                        <Badge tone="amber">Expires {formatTimeUntil(today, t.expires_on)}</Badge>
                      ) : (
                        <Badge tone="green">Valid</Badge>
                      ))}
                  </Td>
                  <Td>
                    <form action={removeTraining.bind(null, id, t.id)}>
                      <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                    </form>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        ) : (
          <div className="mb-6">
            <Empty>No training recorded.</Empty>
          </div>
        )}
        <ActionForm
          action={addTraining.bind(null, id)}
          submitLabel="Add training"
          variant="secondary"
          className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end"
        >
          <Field label="Training">
            <Select name="training_type_id" required defaultValue="">
              <option value="" disabled>
                Choose…
              </option>
              {(trainingTypes ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Completed">
            <Input name="completed_on" type="date" />
          </Field>
          <Field label="Expires" hint="Blank: worked out from the course.">
            <Input name="expires_on" type="date" />
          </Field>
        </ActionForm>
      </Card>

      <Card title="Contract">
        {contracts?.length ? (
          <ul className="mb-6 divide-y divide-stone-100 text-sm">
            {contracts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-2">
                <span>
                  <a href={`/files/contracts/${c.id}`} target="_blank" className="text-brand-800 hover:underline">
                    {c.title}
                  </a>{" "}
                  <span className="text-stone-500">
                    · uploaded {formatTimestamp(c.uploaded_at)}
                    {c.uploaded_by_name && ` by ${c.uploaded_by_name}`}
                  </span>
                </span>
                <form action={removeContract.bind(null, id, c.id)}>
                  <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mb-6">
            <Empty>No signed contract uploaded.</Empty>
          </div>
        )}
        <ActionForm
          action={uploadContract.bind(null, id)}
          submitLabel="Upload signed contract"
          variant="secondary"
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <Field label="Title">
            <Input name="title" defaultValue="Contract of employment" required />
          </Field>
          <Field label="Signed contract (PDF)" hint={`Up to ${MAX_FILE_MB}MB.`}>
            <Input name="file" type="file" accept="application/pdf" required />
          </Field>
        </ActionForm>
      </Card>

      {tasks && tasks.length > 0 && (
        <Card title={`Onboarding checklist (${doneTasks}/${tasks.length})`}>
          <ul className="mb-4 space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4">
                <Toggle checked={!!t.completed_at} action={setTaskDone.bind(null, id, t.id)}>
                  {t.title}
                  {t.automation && !t.completed_at && <span className="text-xs text-stone-400"> · ticks itself</span>}
                  {t.completed_at && (
                    <span className="block text-xs text-stone-500">
                      {t.completed_by_name ?? "Done"} · {formatTimestamp(t.completed_at)}
                    </span>
                  )}
                </Toggle>
                <form action={removeTask.bind(null, id, t.id)}>
                  <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
          <ActionForm action={addTask.bind(null, id)} submitLabel="Add task" variant="secondary" className="flex flex-wrap items-end gap-3">
            <div className="min-w-60 flex-1">
              <Field label="Extra task for this person">
                <Input name="title" required />
              </Field>
            </div>
          </ActionForm>
        </Card>
      )}

      <FamlyCard employee={e} />

      <Card title="End of employment">
        {e.leave_date ? (
          <div className="space-y-3 text-sm">
            <DetailList
              items={[
                ["Leave date", formatDate(e.leave_date)],
                ["Reason", e.leave_reason],
              ]}
            />
            <form action={reinstateEmployee.bind(null, id)}>
              <button className="text-sm text-brand-700 hover:underline">Undo: they&apos;re still employed</button>
            </form>
          </div>
        ) : (
          <ActionForm
            action={endEmployment.bind(null, id)}
            submitLabel="End employment"
            variant="danger"
            confirm={`End ${e.first_name}'s employment? They'll move to the archive after their leave date.`}
          >
            <p className="text-sm text-stone-600">They move to the archive after their leave date.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Leave date">
                <Input name="leave_date" type="date" required />
              </Field>
              <Field label="Reason">
                <Textarea name="leave_reason" required />
              </Field>
            </div>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
