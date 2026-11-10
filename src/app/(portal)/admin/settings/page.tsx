import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, Input, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addChecklistStep, addTrainingType, removeChecklistStep, setTrainingTypeActive } from "./actions";

const automationNames: Record<string, string> = {
  form_sent: "when the form is sent",
  form_returned: "when the starter returns the form",
  employment_details: "when all employment details are filled in",
  contract_uploaded: "when a signed contract is uploaded",
  payroll_ref: "when a payroll reference is added",
};

export default async function SettingsPage() {
  await requireSession("admin");
  const supabase = await createClient();
  const [{ data: types }, { data: steps }] = await Promise.all([
    supabase.from("training_types").select("*").order("active", { ascending: false }).order("name"),
    supabase.from("onboarding_task_templates").select("*").eq("active", true).order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title="Training & checklist" />

      <Card title="Training types">
        <p className="mb-4 text-sm text-stone-600">
          The length is used to work out the expiry date when a manager records training without one.
        </p>
        <div className="mb-6">
          <Table head={["Training", "Lasts", ""]}>
            {(types ?? []).map((t) => (
              <tr key={t.id} className={t.active ? "" : "text-stone-400"}>
                <Td>{t.name}</Td>
                <Td>{t.validity_months ? `${t.validity_months} months` : "Doesn't expire"}</Td>
                <Td>
                  <form action={setTrainingTypeActive.bind(null, t.id, !t.active)}>
                    <button className="text-xs text-stone-500 hover:text-teal-700 hover:underline">
                      {t.active ? "Hide" : "Show again"}
                    </button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        </div>
        <ActionForm action={addTrainingType} submitLabel="Add training type" variant="secondary" className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <Field label="Training">
            <Input name="name" required />
          </Field>
          <Field label="Lasts (months)" hint="Blank if it doesn't expire.">
            <Input name="validity_months" inputMode="numeric" />
          </Field>
        </ActionForm>
      </Card>

      <Card title="New starter checklist">
        <p className="mb-4 text-sm text-stone-600">
          Every new starter gets these steps. Steps marked automatic tick themselves; managers tick the rest. Changes apply to
          new starters added from now on.
        </p>
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm">
          {(steps ?? []).map((s) => (
            <li key={s.id}>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {s.title}{" "}
                  {s.automation && <Badge tone="green">Automatic {automationNames[s.automation]}</Badge>}
                </span>
                <form action={removeChecklistStep.bind(null, s.id)}>
                  <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                </form>
              </span>
            </li>
          ))}
        </ol>
        <ActionForm action={addChecklistStep} submitLabel="Add step" variant="secondary" className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1">
            <Field label="New step">
              <Input name="title" required />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
