import Link from "next/link";
import { Badge, Card, Empty, LinkButton, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, formatLengthOfService, formatTimeUntil, isCurrentEmployee, nextMilestone, todayInLondon } from "@/lib/dates";
import { fullName, sortStaff, STAFF_SORT_KEYS, type StaffSortKey } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage({ searchParams }: PageProps<"/staff">) {
  await requireSession();
  const params = await searchParams;
  const archive = params.view === "archive";
  const sort = STAFF_SORT_KEYS.find((k) => k === params.sort) ?? "name";
  const dir = params.dir === "desc" ? "desc" : "asc";
  const today = todayInLondon();

  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, first_name, last_name, job_title, start_date, leave_date, leave_reason");
  const employees = sortStaff(
    (data ?? []).filter((e) => isCurrentEmployee(e, today) !== archive),
    sort,
    dir,
    today,
  );

  // A column heading that sorts by that column; clicking it again reverses the order.
  const heading = (key: StaffSortKey, label: string) => {
    const active = sort === key;
    const next = active && dir === "asc" ? "desc" : "asc";
    const query = new URLSearchParams({ ...(archive && { view: "archive" }), sort: key, dir: next });
    return (
      <Link
        href={`/staff?${query}`}
        className={`inline-flex items-center gap-1 hover:text-stone-800 ${active ? "text-stone-800" : ""}`}
      >
        {label}
        <span aria-hidden className={active ? "" : "invisible"}>
          {dir === "asc" || !active ? "▲" : "▼"}
        </span>
      </Link>
    );
  };

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
                className={`rounded-md px-3 py-1.5 font-medium transition ${active ? "bg-white text-brand-800 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
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
          <Table
            head={[
              heading("name", "Name"),
              heading("job_title", "Job title"),
              heading("start_date", "Start date"),
              heading("leave_date", "Leave date"),
              heading("service", "Length of service"),
              heading("leave_reason", "Reason"),
            ]}
          >
            {employees.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link href={`/staff/${e.id}`} className="font-medium text-brand-800 hover:underline">
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
          <Table
            head={[
              heading("name", "Name"),
              heading("job_title", "Job title"),
              heading("start_date", "Start date"),
              heading("service", "Length of service"),
              heading("anniversary", "Next major anniversary"),
              "",
            ]}
          >
            {employees.map((e) => {
              const milestone = e.start_date ? nextMilestone(e.start_date, today) : null;
              return (
                <tr key={e.id}>
                  <Td>
                    <Link href={`/staff/${e.id}`} className="font-medium text-brand-800 hover:underline">
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
