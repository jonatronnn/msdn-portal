import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
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
            staff records; your bank details can only be seen by the owner. Fields marked * are required. This link works
            once.
          </p>
          <ActionForm action={submitStarterForm.bind(null, token)} submitLabel="Send my details" className="space-y-8">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-semibold">About you</legend>
              <Field label="Date of birth *">
                <Input name="date_of_birth" type="date" required />
              </Field>
              <Field label="Mobile number *">
                <Input name="mobile_phone" type="tel" autoComplete="tel" required />
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
          </ActionForm>
        </div>
      )}
    </main>
  );
}
