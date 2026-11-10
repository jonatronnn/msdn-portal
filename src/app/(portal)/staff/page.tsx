import Link from "next/link";
import { Badge, Card, Empty, LinkButton, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, formatLengthOfService, formatTimeUntil, isCurrentEmployee, nextMilestone, todayInLondon } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage({ searchParams }: PageProps<"/staff">) {
  await requireSession();
  const archive = (await searchParams).view === "archive";
  const today = todayInLondon();

  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, first_name, last_name, job_title, start_date, leave_date, leave_reason")
    .order("last_name")
    .order("first_name");
  const employees = (data ?? []).filter((e) => isCurrentEmployee(e, today) !== archive);

  return (
    <>
      <PageHeader title="Staff directory">
        <LinkButton href="/onboarding/new" variant="primary">
          New starter
        </LinkButton>
        <LinkButton href="/staff/new">Add existing staff member</LinkButton>
        <LinkButton href="/staff/import">Import from Famly</LinkButton>
      </PageHeader>
      <Card
        actions={
          <div className="flex rounded-lg bg-stone-100 p-1 text-sm" role="group" aria-label="Show">
            {[
              ["/staff", "Current staff", !archive],
              ["/staff?view=archive", "Archive", archive],
            ].map(([href, label, active]) => (
              <Link
                key={label as string}
                href={href as string}
                aria-current={active as boolean}
                className={`rounded-md px-3 py-1.5 font-medium transition ${active ? "bg-white text-teal-800 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        }
      >
        {employees.length === 0 ? (
          <Empty>{archive ? "No former staff." : "No staff yet. Add existing staff or a new starter."}</Empty>
        ) : archive ? (
          <Table head={["Name", "Job title", "Start date", "Leave date", "Length of service", "Reason"]}>
            {employees.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link href={`/staff/${e.id}`} className="font-medium text-teal-800 hover:underline">
                    {fullName(e)}
                  </Link>
                </Td>
                <Td>{e.job_title}</Td>
                <Td className="whitespace-nowrap">{formatDate(e.start_date)}</Td>
                <Td className="whitespace-nowrap">{formatDate(e.leave_date)}</Td>
                <Td className="whitespace-nowrap">{formatLengthOfService(e.start_date, e.leave_date, today)}</Td>
                <Td>{e.leave_reason}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Table head={["Name", "Job title", "Start date", "Length of service", "Next major anniversary", ""]}>
            {employees.map((e) => {
              const milestone = e.start_date ? nextMilestone(e.start_date, today) : null;
              return (
                <tr key={e.id}>
                  <Td>
                    <Link href={`/staff/${e.id}`} className="font-medium text-teal-800 hover:underline">
                      {fullName(e)}
                    </Link>
                  </Td>
                  <Td>{e.job_title}</Td>
                  <Td className="whitespace-nowrap">{formatDate(e.start_date)}</Td>
                  <Td className="whitespace-nowrap">{formatLengthOfService(e.start_date, null, today)}</Td>
                  <Td className="whitespace-nowrap">
                    {milestone && (
                      <>
                        {milestone.years} yr{milestone.years === 1 ? "" : "s"}{" "}
                        <span className="text-stone-500">
                          {formatTimeUntil(today, milestone.date)} · {formatDate(milestone.date)}
                        </span>
                      </>
                    )}
                  </Td>
                  <Td>{e.leave_date && <Badge tone="amber">Leaving {formatDate(e.leave_date)}</Badge>}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
