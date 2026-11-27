import { ActionForm } from "@/components/action-form";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { MINIMUM_FOR_KEY, PAY_RATE_KEYS } from "@/lib/pay";
import { createClient } from "@/lib/supabase/server";
import { savePayRates } from "./actions";

const money = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

export default async function PayRatesPage() {
  await requireSession("admin");
  const supabase = await createClient();
  const { data: rows } = await supabase.from("pay_rates").select("*");
  const rates = new Map((rows ?? []).map((r) => [r.key, r]));
  const lastChange = (rows ?? []).reduce<(typeof rows & {})[number] | null>(
    (latest, r) => (!latest || r.updated_at > latest.updated_at ? r : latest),
    null,
  );

  return (
    <>
      <PageHeader title="Pay rates" />
      <Card title="Hourly rates">
        <ActionForm action={savePayRates} submitLabel="Save pay rates">
          <div className="grid gap-4 sm:grid-cols-2">
            {PAY_RATE_KEYS.map(({ key, label }) => {
              const rate = Number(rates.get(key)?.rate ?? 0);
              const minimum = MINIMUM_FOR_KEY[key];
              return (
                <Field key={key} label={`${label} (£)`}>
                  <Input name={key} inputMode="decimal" defaultValue={rate.toFixed(2)} required />
                  {minimum != null && rate < minimum && (
                    <span className="mt-1 block text-xs text-red-700">Below the minimum wage of {money(minimum)}.</span>
                  )}
                </Field>
              );
            })}
          </div>
        </ActionForm>
        {lastChange?.updated_by_name && (
          <p className="mt-4 text-xs text-stone-500">
            Last changed {formatDate(lastChange.updated_at.slice(0, 10))} by {lastChange.updated_by_name}.
          </p>
        )}
      </Card>
    </>
  );
}
