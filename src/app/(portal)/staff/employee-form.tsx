import { Field, Input, Select } from "@/components/ui";
import type { Database } from "@/lib/database.types";
import { CONTRACT_TYPES, formatNiNumber, QUALIFICATION_LEVELS } from "@/lib/staff";

type Employee = Partial<Database["public"]["Tables"]["employees"]["Row"]>;

const v = (value: string | number | null | undefined) => (value == null ? "" : String(value));

// Details managers enter, plus the payroll reference.
export function EmploymentFields({ employee = {} }: { employee?: Employee }) {
  return (
    <div className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Name and email</legend>
        <Field label="First name *">
          <Input name="first_name" defaultValue={v(employee.first_name)} required />
        </Field>
        <Field label="Last name *">
          <Input name="last_name" defaultValue={v(employee.last_name)} required />
        </Field>
        <Field label="Email *" hint="The Important information form is sent here.">
          <Input name="email" type="email" defaultValue={v(employee.email)} required />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Job and contract</legend>
        <Field label="Job title *">
          <Input name="job_title" defaultValue={v(employee.job_title)} required />
        </Field>
        <Field label="Employment start date *">
          <Input name="start_date" type="date" defaultValue={v(employee.start_date)} required />
        </Field>
        <Field label="Contract type">
          <Select name="contract_type" defaultValue={v(employee.contract_type)}>
            <option value="">Not recorded</option>
            {CONTRACT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Contract end date" hint="For fixed-term contracts.">
          <Input name="contract_end_date" type="date" defaultValue={v(employee.contract_end_date)} />
        </Field>
        <Field label="Notice period">
          <Input name="notice_period" defaultValue={v(employee.notice_period)} placeholder="e.g. 4 weeks" />
        </Field>
        <Field label="Probation end date">
          <Input name="probation_end_date" type="date" defaultValue={v(employee.probation_end_date)} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Hours and pay</legend>
        <Field label="Working pattern">
          <Input name="working_pattern" defaultValue={v(employee.working_pattern)} placeholder="e.g. Mon–Thu, 8am–6pm" />
        </Field>
        <Field label="Contracted hours per week">
          <Input name="contracted_hours" inputMode="decimal" defaultValue={v(employee.contracted_hours)} />
        </Field>
        <Field label="Pay rate (£)">
          <Input name="pay_rate" inputMode="decimal" defaultValue={v(employee.pay_rate)} />
        </Field>
        <Field label="Paid">
          <Select name="pay_rate_basis" defaultValue={v(employee.pay_rate_basis)}>
            <option value="">Not recorded</option>
            <option value="hourly">Per hour</option>
            <option value="annual">Per year (salary)</option>
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Qualification and payroll</legend>
        <Field label="Qualification level">
          <Select name="qualification_level" defaultValue={v(employee.qualification_level)}>
            <option value="">Not recorded</option>
            {QUALIFICATION_LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Qualification date">
          <Input name="qualification_date" type="date" defaultValue={v(employee.qualification_date)} />
        </Field>
        <Field label="Payroll reference number" hint="Added by the owner or a manager once they're on payroll.">
          <Input name="payroll_id" defaultValue={v(employee.payroll_id)} />
        </Field>
      </fieldset>
    </div>
  );
}

// Details the starter normally gives on the Important information form.
// Bank details are separate: only the owner can see or change them.
export function PersonalFields({ employee = {} }: { employee?: Employee }) {
  return (
    <div className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Personal details</legend>
        <Field label="Date of birth">
          <Input name="date_of_birth" type="date" defaultValue={v(employee.date_of_birth)} />
        </Field>
        <Field label="Mobile number">
          <Input name="mobile_phone" type="tel" defaultValue={v(employee.mobile_phone)} />
        </Field>
        <Field label="National Insurance number">
          <Input name="ni_number" defaultValue={formatNiNumber(employee.ni_number ?? null)} placeholder="AB 12 34 56 C" />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Home address</legend>
        <Field label="Address line 1">
          <Input name="address_line1" defaultValue={v(employee.address_line1)} />
        </Field>
        <Field label="Address line 2">
          <Input name="address_line2" defaultValue={v(employee.address_line2)} />
        </Field>
        <Field label="Town / city">
          <Input name="town" defaultValue={v(employee.town)} />
        </Field>
        <Field label="Postcode">
          <Input name="postcode" defaultValue={v(employee.postcode)} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Emergency contact</legend>
        <Field label="Name">
          <Input name="emergency_contact_name" defaultValue={v(employee.emergency_contact_name)} />
        </Field>
        <Field label="Relationship">
          <Input name="emergency_contact_relationship" defaultValue={v(employee.emergency_contact_relationship)} />
        </Field>
        <Field label="Phone">
          <Input name="emergency_contact_phone" type="tel" defaultValue={v(employee.emergency_contact_phone)} />
        </Field>
      </fieldset>
    </div>
  );
}
