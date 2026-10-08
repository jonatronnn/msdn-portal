import { Field, Input, Select, Textarea } from "@/components/ui";
import type { Database } from "@/lib/database.types";
import { formatNiNumber, QUALIFICATION_LEVELS } from "@/lib/staff";

type Employee = Partial<Database["public"]["Tables"]["employees"]["Row"]>;

export function EmployeeFields({ employee = {} }: { employee?: Employee }) {
  const v = (value: string | null | undefined) => value ?? "";
  return (
    <div className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Personal details</legend>
        <Field label="First name">
          <Input name="first_name" defaultValue={v(employee.first_name)} required />
        </Field>
        <Field label="Last name">
          <Input name="last_name" defaultValue={v(employee.last_name)} required />
        </Field>
        <Field label="Date of birth">
          <Input name="date_of_birth" type="date" defaultValue={v(employee.date_of_birth)} />
        </Field>
        <Field label="Email" hint="Used for their portal invitation and contracts.">
          <Input name="email" type="email" defaultValue={v(employee.email)} />
        </Field>
        <Field label="Mobile">
          <Input name="mobile_phone" type="tel" defaultValue={v(employee.mobile_phone)} />
        </Field>
        <Field label="Home phone">
          <Input name="home_phone" type="tel" defaultValue={v(employee.home_phone)} />
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

      <fieldset className="grid gap-4 sm:grid-cols-2">
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

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Employment</legend>
        <Field label="Job title">
          <Input name="job_title" defaultValue={v(employee.job_title)} />
        </Field>
        <Field label="Start date">
          <Input name="start_date" type="date" defaultValue={v(employee.start_date)} />
        </Field>
        <Field label="Employee ID">
          <Input name="employee_number" defaultValue={v(employee.employee_number)} />
        </Field>
        <Field label="Payroll ID" hint="Must match the payroll ID in QuickBooks payslip file names.">
          <Input name="payroll_id" defaultValue={v(employee.payroll_id)} />
        </Field>
        <Field label="National Insurance number">
          <Input name="ni_number" defaultValue={formatNiNumber(employee.ni_number ?? null)} placeholder="AB 12 34 56 C" />
        </Field>
        <Field label="Qualification level">
          <Select name="qualification_level" defaultValue={v(employee.qualification_level)}>
            <option value="">Not recorded</option>
            {QUALIFICATION_LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Leaving</legend>
        <Field label="Leave date" hint="Leavers are hidden from the directory by default.">
          <Input name="leave_date" type="date" defaultValue={v(employee.leave_date)} />
        </Field>
        <Field label="Leave reason">
          <Textarea name="leave_reason" defaultValue={v(employee.leave_reason)} />
        </Field>
      </fieldset>
    </div>
  );
}
