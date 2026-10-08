import { ActionForm } from "@/components/action-form";
import { Badge, Card, DetailList, Empty, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, formatLengthOfService, todayInLondon } from "@/lib/dates";
import { formatAddress, formatNiNumber, QUALIFICATION_LEVELS } from "@/lib/staff";
import { MAX_FILE_MB } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { submitStarterForm } from "./actions";

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const session = await requireSession();
  const { submitted } = await searchParams;

  if (!session.employeeId) {
    return (
      <>
        <PageHeader title="My details" />
        <Card>
          <Empty>Your login isn&apos;t linked to an employee record. Please ask an admin to link it.</Empty>
        </Card>
      </>
    );
  }

  const supabase = await createClient();
  const [{ data: e }, { data: qualifications }, { data: contracts }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", session.employeeId).single(),
    supabase.from("employee_qualifications").select("*").eq("employee_id", session.employeeId).order("achieved_on"),
    supabase.from("contracts").select("id, title, status, signed_at").eq("employee_id", session.employeeId).order("created_at", { ascending: false }),
  ]);
  if (!e) return null;

  if (!e.starter_form_completed_at) {
    return (
      <>
        <PageHeader title="New starter form" />
        <Card>
          <p className="mb-6 text-sm text-stone-600">
            Welcome to Montagu Square Day Nursery! Please check and complete your details. Fields marked * are required.
          </p>
          <ActionForm action={submitStarterForm} submitLabel="Submit my details">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-semibold">About you</legend>
              <Field label="Date of birth *">
                <Input name="date_of_birth" type="date" defaultValue={e.date_of_birth ?? ""} required />
              </Field>
              <Field label="Email *">
                <Input name="email" type="email" defaultValue={e.email ?? session.email} required />
              </Field>
              <Field label="Mobile *">
                <Input name="mobile_phone" type="tel" defaultValue={e.mobile_phone ?? ""} required />
              </Field>
              <Field label="Home phone">
                <Input name="home_phone" type="tel" defaultValue={e.home_phone ?? ""} />
              </Field>
              <Field label="National Insurance number *" hint="You'll find it on a payslip, P60 or letters from HMRC.">
                <Input name="ni_number" defaultValue={formatNiNumber(e.ni_number)} placeholder="AB 12 34 56 C" required />
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 font-semibold">Emergency contact</legend>
              <Field label="Name *">
                <Input name="emergency_contact_name" defaultValue={e.emergency_contact_name ?? ""} required />
              </Field>
              <Field label="Relationship to you *">
                <Input name="emergency_contact_relationship" defaultValue={e.emergency_contact_relationship ?? ""} required />
              </Field>
              <Field label="Phone *">
                <Input name="emergency_contact_phone" type="tel" defaultValue={e.emergency_contact_phone ?? ""} required />
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-semibold">Home address</legend>
              <Field label="Address line 1 *">
                <Input name="address_line1" defaultValue={e.address_line1 ?? ""} required />
              </Field>
              <Field label="Address line 2">
                <Input name="address_line2" defaultValue={e.address_line2 ?? ""} />
              </Field>
              <Field label="Town / city *">
                <Input name="town" defaultValue={e.town ?? ""} required />
              </Field>
              <Field label="Postcode *">
                <Input name="postcode" defaultValue={e.postcode ?? ""} required />
              </Field>
            </fieldset>
            <fieldset className="space-y-4">
              <legend className="mb-2 font-semibold">Qualifications</legend>
              <Field label="Highest childcare qualification level">
                <Select name="qualification_level" defaultValue={e.qualification_level ?? "Unqualified"}>
                  {QUALIFICATION_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>
              <p className="text-sm text-stone-600">Other qualifications (e.g. paediatric first aid, food hygiene):</p>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <Input name="qualification_name" aria-label={`Qualification ${i + 1}`} placeholder="Qualification" />
                  <Input name="qualification_date" type="date" aria-label={`Qualification ${i + 1} date achieved`} />
                </div>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="mb-2 font-semibold">P45</legend>
              <Field
                label="Upload your P45 from your last job (PDF)"
                hint={`If you don't have one, leave this blank and the office will talk to you about a starter checklist. Up to ${MAX_FILE_MB}MB.`}
              >
                <Input name="p45" type="file" accept="application/pdf" />
              </Field>
            </fieldset>
          </ActionForm>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="My details" />
      {submitted && <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">Thank you, your details have been saved.</p>}
      <Card title="Personal details">
        <DetailList
          items={[
            ["Name", `${e.first_name} ${e.last_name}`],
            ["Date of birth", formatDate(e.date_of_birth)],
            ["Email", e.email],
            ["Mobile", e.mobile_phone],
            ["Home phone", e.home_phone],
            ["Home address", formatAddress(e)],
            ["National Insurance number", formatNiNumber(e.ni_number)],
          ]}
        />
        <p className="mt-4 text-xs text-stone-500">To change any of these, please speak to the nursery office.</p>
      </Card>
      <Card title="Emergency contact">
        <DetailList
          items={[
            ["Name", e.emergency_contact_name],
            ["Relationship", e.emergency_contact_relationship],
            ["Phone", e.emergency_contact_phone],
          ]}
        />
      </Card>
      <Card title="Employment">
        <DetailList
          items={[
            ["Job title", e.job_title],
            ["Employee ID", e.employee_number],
            ["Start date", formatDate(e.start_date)],
            ["Length of service", formatLengthOfService(e.start_date, e.leave_date, todayInLondon())],
            ["Qualification level", e.qualification_level],
            ["Other qualifications", (qualifications ?? []).map((q) => q.name).join(", ")],
          ]}
        />
      </Card>
      <Card title="My contracts">
        {contracts?.length ? (
          <ul className="divide-y divide-stone-100 text-sm">
            {contracts.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <a href={`/contracts/${c.id}`} className="text-teal-800 hover:underline">
                  {c.title}
                </a>
                {c.status === "signed" ? <Badge tone="green">Signed {formatDate(c.signed_at)}</Badge> : <Badge tone="amber">Please sign</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No contracts yet.</Empty>
        )}
      </Card>
    </>
  );
}
