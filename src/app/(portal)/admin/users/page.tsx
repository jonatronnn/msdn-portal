import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { changeRole, inviteAction, resetMfa, setActive } from "./actions";

const roleOptions = [
  ["manager", "Manager"],
  ["admin", "Owner"],
] as const;

export default async function UsersPage() {
  const session = await requireSession("admin");
  const supabase = await createClient();
  // Inactive "staff" profiles are left over from accounts that are no longer used.
  const { data: profiles } = await supabase.from("profiles").select("*").neq("role", "staff").order("full_name");

  return (
    <>
      <PageHeader title="Users" />
      <Card title="Invite someone">
        <p className="mb-4 text-sm text-stone-600">
          They&apos;ll get an email to set a password, then set up two-step sign-in with an authenticator app. Only the owner
          can see bank details and change these settings.
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
        </ActionForm>
      </Card>

      <Card title="Accounts">
        <Table head={["Name", "Role", "Status", ""]}>
          {(profiles ?? []).map((p) => {
            const self = p.id === session.userId;
            return (
              <tr key={p.id}>
                <Td>
                  <p className="font-medium">{p.full_name || "—"}</p>
                  <p className="text-xs text-stone-500">{p.email}</p>
                </Td>
                <Td>
                  {self ? (
                    "Owner (you)"
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
                <Td>{p.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</Td>
                <Td>
                  {!self && (
                    <div className="space-y-2">
                      <form action={setActive.bind(null, p.id, !p.active)}>
                        <button className={`text-sm hover:underline ${p.active ? "text-red-700" : "text-brand-700"}`}>
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
