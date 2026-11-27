import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { addNewStarter } from "@/app/(portal)/staff/actions";
import { nextPayrollId } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export default async function NewStarterPage() {
  await requireSession();
  const supabase = await createClient();
  const { data: ids } = await supabase.from("employees").select("payroll_id").not("payroll_id", "is", null);
  const payrollId = nextPayrollId((ids ?? []).map((e) => e.payroll_id));
  return (
    <>
      <PageHeader title="New starter" />
      <Card>
        <p className="mb-6 text-sm text-stone-600">
          This creates their record and onboarding checklist. You can add the job, contract, hours and pay details on their
          page afterwards.
        </p>
        <ActionForm action={addNewStarter} submitLabel="Create new starter">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name *">
              <Input name="first_name" required />
            </Field>
            <Field label="Last name *">
              <Input name="last_name" required />
            </Field>
            <Field label="Email *">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Job title">
              <Input name="job_title" />
            </Field>
            <Field label="Start date">
              <Input name="start_date" type="date" />
            </Field>
            <Field label="Employee / payroll ID">
              <Input name="payroll_id" defaultValue={payrollId} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="send_form" defaultChecked className="h-4 w-4 accent-brand-700" />
            Email them the Important information form now
          </label>
        </ActionForm>
      </Card>
    </>
  );
}
