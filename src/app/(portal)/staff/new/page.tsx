import { ActionForm } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { createEmployee } from "../actions";
import { EmployeeFields } from "../employee-form";

export default async function NewEmployeePage() {
  await requireSession("admin", "manager");
  return (
    <>
      <PageHeader title="Add employee" />
      <Card>
        <p className="mb-6 text-sm text-stone-600">
          Only the name is required. You can invite the new starter to the portal afterwards so they fill in the rest
          themselves.
        </p>
        <ActionForm action={createEmployee} submitLabel="Add employee">
          <EmployeeFields />
        </ActionForm>
      </Card>
    </>
  );
}
