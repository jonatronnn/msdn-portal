import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { updateEmployee } from "../../actions";
import { EmployeeFields } from "../../employee-form";

export default async function EditEmployeePage({ params }: PageProps<"/staff/[id]/edit">) {
  await requireSession("admin", "manager");
  const { id } = await params;
  const supabase = await createClient();
  const { data: employee } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (!employee) notFound();

  return (
    <>
      <PageHeader title={`Edit ${fullName(employee)}`}>
        <LinkButton href={`/staff/${id}`}>Cancel</LinkButton>
      </PageHeader>
      <Card>
        <ActionForm action={updateEmployee.bind(null, id)} submitLabel="Save changes">
          <EmployeeFields employee={employee} />
        </ActionForm>
      </Card>
    </>
  );
}
