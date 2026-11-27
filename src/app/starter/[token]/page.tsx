import { ActionForm } from "@/components/action-form";
import { BirthplaceFields, MedicalFields } from "@/app/(portal)/staff/employee-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { GENDERS } from "@/lib/staff";
import { findUsableLink } from "../link";
import { submitStarterForm } from "./actions";

export default async function StarterFormPage({ params }: PageProps<"/starter/[token]">) {
  const { token } = await params;
  const link = await findUsableLink(token);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-brand-700">Montagu Square Day Nursery</p>
      <h1 className="mb-6 text-2xl font-semibold">Important information</h1>
      {!link?.employees ? (
        <p className="rounded-lg border border-stone-200 bg-white p-6 text-sm shadow-sm">
          This link has expired or has already been used. Please contact the nursery office for a new one.
        </p>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <p className="mb-6 text-sm text-stone-600">
            Hi {link.employees.first_name}, please fill in your details below. They go straight to the nursery&apos;s secure
            staff records. Your bank details can only be seen by the owner, and your ID numbers and
            medical details only by the owner and managers. Fields marked * are required. This link works
            once.
          </p>
          <ActionForm action={submitStarterForm.bind(null, token)} submitLabel="Send my details" className="space-y-8">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-semibold">About you</legend>
              <Field label="First name *">
                <Input name="first_name" autoComplete="given-name" defaultValue={link.employees.first_name} required />
              </Field>
              <Field label="Middle name">
                <Input name="middle_name" autoComplete="additional-name" defaultValue={link.employees.middle_name ?? ""} />
              </Field>
              <Field label="Last name *">
                <Input name="last_name" autoComplete="family-name" defaultValue={link.employees.last_name} required />
              </Field>
              <Field label="Nickname" hint="What you like to be called, if different.">
                <Input name="nickname" />
              </Field>
              <Field label="Gender">
                <Select name="gender" defaultValue="">
                  <option value="">Not specified</option>
                  {GENDERS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Date of birth *">
                <Input name="date_of_birth" type="date" required />
              </Field>
              <BirthplaceFields />
              <Field label="Email *">
                <Input name="email" type="email" autoComplete="email" defaultValue={link.employees.email} required />
              </Field>
              <Field label="Mobile number *">
                <Input name="mobile_phone" type="tel" autoComplete="tel" required />
              </Field>
              <Field label="Home phone">
                <Input name="home_phone" type="tel" />
              </Field>
              <Field label="National Insurance number *" hint="On a payslip, P60 or letters from HMRC.">
                <Input name="ni_number" placeholder="AB 12 34 56 C" required />
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-semibold">Home address</legend>
              <Field label="Address line 1 *">
                <Input name="address_line1" autoComplete="address-line1" required />
              </Field>
              <Field label="Address line 2">
                <Input name="address_line2" autoComplete="address-line2" />
              </Field>
              <Field label="Town / city *">
                <Input name="town" autoComplete="address-level2" required />
              </Field>
              <Field label="Postcode *">
                <Input name="postcode" autoComplete="postal-code" required />
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 font-semibold">Emergency contact</legend>
              <Field label="Name *">
                <Input name="emergency_contact_name" required />
              </Field>
              <Field label="Relationship to you *">
                <Input name="emergency_contact_relationship" required />
              </Field>
              <Field label="Phone *">
                <Input name="emergency_contact_phone" type="tel" required />
              </Field>
              <div className="sm:col-span-3">
                <Field label="Address">
                  <Input name="emergency_contact_address" />
                </Field>
              </div>
            </fieldset>
            <MedicalFields />
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-semibold">Passport and driving licence</legend>
              <Field label="Passport number">
                <Input name="passport_number" autoComplete="off" />
              </Field>
              <Field label="Driving licence number">
                <Input name="driving_licence_number" autoComplete="off" />
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-3">
              <legend className="mb-2 font-semibold">Bank details for your pay</legend>
              <Field label="Name on account *">
                <Input name="account_name" autoComplete="off" required />
              </Field>
              <Field label="Sort code *">
                <Input name="sort_code" inputMode="numeric" autoComplete="off" placeholder="12-34-56" required />
              </Field>
              <Field label="Account number *">
                <Input name="account_number" inputMode="numeric" autoComplete="off" required />
              </Field>
            </fieldset>
            <Field label="Additional information" hint="Anything else the nursery should know.">
              <Textarea name="special_notes" rows={3} />
            </Field>
          </ActionForm>
        </div>
      )}
    </main>
  );
}
