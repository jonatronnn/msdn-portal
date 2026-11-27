import { ActionForm } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { addExistingEmployee } from "../actions";
import { EmploymentFields } from "../employee-form";

export default async function AddExistingEmployeePage() {
  await requireSession();
  return (
    <>
      <PageHeader title="Add existing staff member" />
      <Card>
        <ActionForm action={addExistingEmployee} submitLabel="Add staff member">
          <EmploymentFields />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="send_form" className="h-4 w-4 accent-brand-700" />
            Email them the Important information form to fill in their personal and bank details
          </label>
        </ActionForm>
      </Card>
    </>
  );
}
