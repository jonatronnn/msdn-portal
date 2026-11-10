import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { famlyConnected, listFamlyEmployees } from "@/lib/famly";
import { fromFamly } from "@/lib/famly-mapping";
import { createClient } from "@/lib/supabase/server";
import { importFromFamly } from "../actions";
import { SelectAll } from "./select-all";

export default async function ImportFromFamlyPage() {
  await requireSession();

  if (!famlyConnected()) {
    return (
      <>
        <PageHeader title="Import from Famly" />
        <Card>
          <Empty>Famly isn&apos;t connected yet. Add the Famly API token to turn this on.</Empty>
        </Card>
      </>
    );
  }

  let famlyStaff;
  try {
    famlyStaff = await listFamlyEmployees();
  } catch {
    return (
      <>
        <PageHeader title="Import from Famly" />
        <Card>
          <p className="text-sm text-red-700">Couldn&apos;t reach Famly. Try again later.</p>
        </Card>
      </>
    );
  }

  const supabase = await createClient();
  const { data: portal } = await supabase.from("employees").select("email, famly_id");
  const linkedIds = new Set((portal ?? []).map((e) => e.famly_id).filter(Boolean));
  const portalEmails = new Set((portal ?? []).filter((e) => !e.famly_id).map((e) => e.email));
  const notInPortal = famlyStaff
    .filter((f) => !linkedIds.has(f.id))
    .map((f) => ({ id: f.id, ...fromFamly(f) }))
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  return (
    <>
      <PageHeader title="Import from Famly" />
      <Card>
        {notInPortal.length === 0 ? (
          <Empty>Everyone in Famly is already in the portal.</Empty>
        ) : (
          <ActionForm action={importFromFamly} submitLabel="Import selected">
            <p className="text-sm text-stone-600">
              Current and future staff in Famly who aren&apos;t in the portal yet. Their name, email, job title, date of
              birth, mobile, address and start date are copied across.
            </p>
            <SelectAll name="famly_ids" />
            <Table head={["", "Name", "Email", "Job title", "Start date", ""]}>
              {notInPortal.map((f) => (
                <tr key={f.id}>
                  <Td>
                    <input
                      type="checkbox"
                      name="famly_ids"
                      value={f.id}
                      disabled={!f.email}
                      aria-label={`Import ${f.first_name} ${f.last_name}`}
                      className="h-4 w-4 accent-teal-700"
                    />
                  </Td>
                  <Td className="font-medium">
                    {f.first_name} {f.last_name}
                  </Td>
                  <Td>{f.email || <span className="text-stone-400">None in Famly</span>}</Td>
                  <Td>{f.job_title}</Td>
                  <Td className="whitespace-nowrap">{formatDate(f.start_date)}</Td>
                  <Td>
                    {!f.email ? (
                      <Badge tone="red">Add an email in Famly first</Badge>
                    ) : portalEmails.has(f.email) ? (
                      <Badge tone="amber">Will link to existing record</Badge>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </Table>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="new_starters" className="h-4 w-4 accent-teal-700" />
              They&apos;re new starters: give them the onboarding checklist
            </label>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
