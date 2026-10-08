import { ActionForm } from "@/components/action-form";
import { Card, Field, PageHeader, Select, Textarea } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { weekdayName } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { saveSettings } from "./actions";

export default async function SettingsPage() {
  await requireSession("admin");
  const supabase = await createClient();
  const { data: s } = await supabase.from("notification_settings").select("*").eq("id", 1).single();
  if (!s) return null;

  const checkbox = (name: string, checked: boolean, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-teal-700" />
      {label}
    </label>
  );

  return (
    <>
      <PageHeader title="Email notifications" />
      <Card>
        <ActionForm action={saveSettings} submitLabel="Save settings">
          <Field label="Send notifications to" hint="One or more email addresses, separated by commas or new lines.">
            <Textarea name="recipients" defaultValue={s.recipients.join("\n")} />
          </Field>
          <div className="space-y-2">
            {checkbox("birthdays_enabled", s.birthdays_enabled, "Email on the morning of a staff member's birthday")}
            {checkbox("anniversaries_enabled", s.anniversaries_enabled, "Email on the morning of a work anniversary")}
            {checkbox("weekly_digest_enabled", s.weekly_digest_enabled, "Weekly email of the week's birthdays, anniversaries, starters and leavers")}
          </div>
          <Field label="Send the weekly email on">
            <Select name="weekly_digest_day" defaultValue={String(s.weekly_digest_day)}>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d)}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-stone-500">Emails go out early each morning (UK time).</p>
        </ActionForm>
      </Card>
    </>
  );
}
