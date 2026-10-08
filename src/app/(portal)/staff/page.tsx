import Link from "next/link";
import { Badge, Card, Empty, LinkButton, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, formatLengthOfService, isCurrentEmployee, todayInLondon } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage({ searchParams }: PageProps<"/staff">) {
  await requireSession("admin", "manager");
  const showAll = (await searchParams).show === "all";
  const today = todayInLondon();

  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, first_name, last_name, job_title, employee_number, start_date, leave_date, qualification_level")
    .order("last_name")
    .order("first_name");
  const employees = (data ?? []).filter((e) => showAll || isCurrentEmployee(e, today));

  return (
    <>
      <PageHeader title="Staff directory">
        <LinkButton href="/staff/new" variant="primary">
          Add employee
        </LinkButton>
      </PageHeader>
      <Card
        actions={
          <div className="flex rounded-md border border-stone-300 text-sm" role="group" aria-label="Show">
            <Link href="/staff" className={`px-3 py-1.5 ${showAll ? "" : "bg-teal-700 text-white"}`} aria-current={!showAll}>
              Current staff
            </Link>
            <Link href="/staff?show=all" className={`px-3 py-1.5 ${showAll ? "bg-teal-700 text-white" : ""}`} aria-current={showAll}>
              All staff
            </Link>
          </div>
        }
      >
        {employees.length === 0 ? (
          <Empty>No staff yet. Use “Add employee” to create the first record.</Empty>
        ) : (
          <Table head={["Name", "Job title", "Employee ID", "Qualification", "Start date", "Length of service", ""]}>
            {employees.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link href={`/staff/${e.id}`} className="font-medium text-teal-800 hover:underline">
                    {fullName(e)}
                  </Link>
                </Td>
                <Td>{e.job_title}</Td>
                <Td>{e.employee_number}</Td>
                <Td>{e.qualification_level}</Td>
                <Td className="whitespace-nowrap">{formatDate(e.start_date)}</Td>
                <Td className="whitespace-nowrap">{formatLengthOfService(e.start_date, e.leave_date, today)}</Td>
                <Td>
                  {!isCurrentEmployee(e, today) ? (
                    <Badge>Left {formatDate(e.leave_date)}</Badge>
                  ) : e.leave_date ? (
                    <Badge tone="amber">Leaving {formatDate(e.leave_date)}</Badge>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
