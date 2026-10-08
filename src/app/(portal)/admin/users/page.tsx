import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { fullName } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { changeRole, inviteAction, linkEmployee, resetMfa, setActive } from "./actions";

const roleOptions = [
  ["staff", "Staff"],
  ["manager", "Manager"],
  ["admin", "Owner / admin"],
] as const;

export default async function UsersPage() {
  const session = await requireSession("admin");
  const supabase = await createClient();
  const [{ data: profiles }, { data: employees }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("employees").select("id, first_name, last_name, profile_id").order("last_name"),
  ]);
  const unlinked = (employees ?? []).filter((e) => !e.profile_id);
  const linkedTo = new Map((employees ?? []).filter((e) => e.profile_id).map((e) => [e.profile_id!, e]));

  return (
    <>
      <PageHeader title="Users" />
      <Card title="Invite someone">
        <p className="mb-4 text-sm text-stone-600">
          They&apos;ll get an email to set a password. Managers and admins must also set up two-step sign-in with an
          authenticator app. To invite a staff member, you can also use “Invite to portal” on their staff record.
        </p>
        <ActionForm action={inviteAction} submitLabel="Send invitation" className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input name="full_name" required />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          <Field label="Role">
            <Select name="role" defaultValue="manager">
              {roleOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Employee record" hint="Link their login to their staff record so they see their own details.">
            <Select name="employee_id" defaultValue="">
              <option value="">None</option>
              {unlinked.map((e) => (
                <option key={e.id} value={e.id}>
                  {fullName(e)}
                </option>
              ))}
            </Select>
          </Field>
        </ActionForm>
      </Card>

      <Card title="Accounts">
        <Table head={["Name", "Role", "Employee record", "Status", ""]}>
          {(profiles ?? []).map((p) => {
            const self = p.id === session.userId;
            const linked = linkedTo.get(p.id);
            return (
              <tr key={p.id}>
                <Td>
                  <p className="font-medium">{p.full_name || "—"}</p>
                  <p className="text-xs text-stone-500">{p.email}</p>
                </Td>
                <Td>
                  {self ? (
                    "Owner / admin (you)"
                  ) : (
                    <ActionForm action={changeRole.bind(null, p.id)} submitLabel="Save" variant="secondary" className="flex items-center gap-2">
                      <Select name="role" defaultValue={p.role} aria-label="Role">
                        {roleOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </ActionForm>
                  )}
                </Td>
                <Td>
                  <ActionForm action={linkEmployee.bind(null, p.id)} submitLabel="Save" variant="secondary" className="flex items-center gap-2">
                    <Select name="employee_id" defaultValue={linked?.id ?? ""} aria-label="Employee record">
                      <option value="">None</option>
                      {linked && <option value={linked.id}>{fullName(linked)}</option>}
                      {unlinked.map((e) => (
                        <option key={e.id} value={e.id}>
                          {fullName(e)}
                        </option>
                      ))}
                    </Select>
                  </ActionForm>
                </Td>
                <Td>{p.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</Td>
                <Td>
                  {!self && (
                    <div className="space-y-2">
                      <form action={setActive.bind(null, p.id, !p.active)}>
                        <button className={`text-sm hover:underline ${p.active ? "text-red-700" : "text-teal-700"}`}>
                          {p.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                      <ActionForm
                        action={resetMfa.bind(null, p.id)}
                        submitLabel="Reset two-step sign-in"
                        variant="secondary"
                        className=""
                        confirm="They will need to set up their authenticator app again. Continue?"
                      />
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
