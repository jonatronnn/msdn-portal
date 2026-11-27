import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, Field, Input, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatMinutes, paidMinutes, WEEKDAYS, type ShiftDay } from "@/lib/wages";
import { removeShiftPattern, saveShiftPattern } from "./shift-actions";

type Pattern = { id: string; effective_from: string; week_a_from: string | null; created_by_name: string | null; days: ShiftDay[] };

const hhmm = (time: string) => time.slice(0, 5);

function WeekTable({ days }: { days: ShiftDay[] }) {
  const total = days.reduce((sum, d) => sum + paidMinutes(d), 0);
  return (
    <table className="text-sm">
      <tbody>
        {[...days]
          .sort((a, b) => a.weekday - b.weekday)
          .map((d) => (
            <tr key={d.weekday}>
              <td className="pr-4 font-medium">{WEEKDAYS[d.weekday - 1]}</td>
              <td className="pr-4">
                {hhmm(d.starts_at)}–{hhmm(d.ends_at)}
              </td>
              <td className="pr-4 text-stone-500">{d.break_minutes ? `${d.break_minutes} min break` : "No break"}</td>
              <td>{formatMinutes(paidMinutes(d))}</td>
            </tr>
          ))}
        <tr>
          <td colSpan={3} className="pt-1 text-stone-500">
            Weekly total
          </td>
          <td className="pt-1 font-medium">{formatMinutes(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function WeekInputs({ week, days }: { week: "A" | "B"; days: ShiftDay[] }) {
  return (
    <table className="text-sm">
      <thead className="text-xs text-stone-500">
        <tr>
          <th className="pr-3 text-left font-medium">Day</th>
          <th className="pr-3 text-left font-medium">Works</th>
          <th className="pr-3 text-left font-medium">Start</th>
          <th className="pr-3 text-left font-medium">Finish</th>
          <th className="pr-3 text-left font-medium">Break</th>
          <th className="text-left font-medium">Break (mins)</th>
        </tr>
      </thead>
      <tbody>
        {WEEKDAYS.map((label, i) => {
          const weekday = i + 1;
          const d = days.find((x) => x.weekday === weekday);
          const p = `${week}${weekday}`;
          return (
            <tr key={weekday}>
              <td className="pr-3 py-1 font-medium">{label}</td>
              <td className="pr-3">
                <input type="checkbox" name={`${p}_works`} defaultChecked={!!d} className="h-4 w-4 accent-brand-700" aria-label={`Works ${label}`} />
              </td>
              <td className="pr-3">
                <input type="time" name={`${p}_start`} defaultValue={d ? hhmm(d.starts_at) : ""} className={inputClass} aria-label={`${label} start`} />
              </td>
              <td className="pr-3">
                <input type="time" name={`${p}_end`} defaultValue={d ? hhmm(d.ends_at) : ""} className={inputClass} aria-label={`${label} finish`} />
              </td>
              <td className="pr-3">
                <input type="checkbox" name={`${p}_break`} defaultChecked={!!d?.break_minutes} className="h-4 w-4 accent-brand-700" aria-label={`Break on ${label}`} />
              </td>
              <td>
                <input
                  type="number"
                  name={`${p}_break_minutes`}
                  min={5}
                  step={5}
                  defaultValue={d?.break_minutes ?? ""}
                  className={`${inputClass} w-24`}
                  aria-label={`${label} break minutes`}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ShiftPatternCard({ employeeId, patterns, today }: { employeeId: string; patterns: Pattern[]; today: string }) {
  const sorted = [...patterns].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  const current = sorted.find((p) => p.effective_from <= today);
  const latest = sorted[0];

  return (
    <Card title="Shift pattern">
      {sorted.length ? (
        <ul className="mb-4 space-y-4">
          {sorted.map((p) => (
            <li key={p.id} className="rounded-xl border border-stone-200 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  From <strong>{formatDate(p.effective_from)}</strong>
                  {p.id === current?.id && (
                    <>
                      {" "}
                      <Badge tone="green">Current</Badge>
                    </>
                  )}
                  {p.effective_from > today && (
                    <>
                      {" "}
                      <Badge tone="amber">Upcoming</Badge>
                    </>
                  )}
                  {p.created_by_name && <span className="text-stone-500"> · set by {p.created_by_name}</span>}
                </p>
                <form action={removeShiftPattern.bind(null, employeeId, p.id)}>
                  <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
                </form>
              </div>
              {p.week_a_from ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["A", "B"] as const).map((w) => (
                    <div key={w}>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Week {w}</p>
                      <WeekTable days={p.days.filter((d) => d.week === w)} />
                    </div>
                  ))}
                  <p className="text-xs text-stone-500 sm:col-span-2">Week A includes {formatDate(p.week_a_from)}; the weeks alternate.</p>
                </div>
              ) : (
                <WeekTable days={p.days} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-4">
          <Empty>No shift pattern yet. The monthly timesheets page uses it to fill in contracted hours.</Empty>
        </div>
      )}

      <details>
        <summary className="cursor-pointer text-sm text-brand-700">{sorted.length ? "Set a new shift pattern" : "Add a shift pattern"}</summary>
        <ActionForm action={saveShiftPattern.bind(null, employeeId)} submitLabel="Save shift pattern" className="group mt-4 space-y-4">
          <div className="max-w-xs">
            <Field label="Applies from" hint="A change part-way through a month is used from this day.">
              <Input name="effective_from" type="date" defaultValue={today} required />
            </Field>
          </div>
          <div className="overflow-x-auto">
            <WeekInputs week="A" days={latest?.days.filter((d) => d.week === "A") ?? []} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="alternating" defaultChecked={!!latest?.week_a_from} className="alternating h-4 w-4 accent-brand-700" />
            Has a second pattern (alternating weeks)
          </label>
          <div className="hidden space-y-4 group-has-[.alternating:checked]:block">
            <p className="text-sm text-stone-600">The table above is week A. Week B:</p>
            <div className="overflow-x-auto">
              <WeekInputs week="B" days={latest?.days.filter((d) => d.week === "B") ?? []} />
            </div>
            <div className="max-w-xs">
              <Field label="A date in a week A">
                <Input name="week_a_from" type="date" defaultValue={latest?.week_a_from ?? ""} />
              </Field>
            </div>
          </div>
        </ActionForm>
      </details>
    </Card>
  );
}
