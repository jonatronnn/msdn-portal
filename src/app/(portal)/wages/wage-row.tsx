"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { formatMinutes, WAGE_GRID } from "@/lib/wages";
import { addDay, addSickHours, removeEntry, setClosureChoice, setExtraMinutes, setOvertime } from "./actions";

type Entry = { id: string; kind: "sick_hours" | "sick_day" | "holiday" | string; date: string | null; minutes: number | null };

export type WageRowProps = {
  monthKey: string;
  id: string;
  name: string;
  notes: string[];
  noPattern: boolean;
  contracted: number;
  extraMinutes: number;
  overtimeMinutes: number;
  closureAsHoliday: boolean | null;
  hasClosureDays: boolean;
  entries: Entry[];
  totals: { worked: number; holiday: number; sickDays: string[]; overtime: number; closurePending: boolean };
  editable: boolean;
};

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

// Compact controls, so a whole row fits on one line of the table.
const controlClass =
  "rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20";
const HOURS = Array.from({ length: 13 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function Label({ children }: { children: string }) {
  return <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 xl:hidden">{children}</p>;
}

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs">
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-stone-500 hover:text-red-700" aria-label={`Remove ${label}`}>
          ×
        </button>
      )}
    </span>
  );
}

function ExtraMinutes({ monthKey, id, initial, editable }: { monthKey: string; id: string; initial: number; editable: boolean }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function change(delta: number) {
    const next = value + delta;
    setValue(next);
    setError(undefined);
    // Save once the clicking stops.
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const result = await setExtraMinutes(monthKey, id, next);
      if (result?.error) setError(result.error);
    }, 700);
  }

  const label = `${value > 0 ? "+" : ""}${formatMinutes(value)}`;
  if (!editable) return <span>{value ? label : "—"}</span>;
  return (
    <div>
      <div className="inline-flex items-center rounded-lg ring-1 ring-stone-300">
        <button type="button" onClick={() => change(-5)} className="px-3 py-1.5 text-lg leading-none hover:bg-stone-100" aria-label="5 minutes less">
          −
        </button>
        <span className="min-w-16 text-center text-sm tabular-nums">{label}</span>
        <button type="button" onClick={() => change(5)} className="px-3 py-1.5 text-lg leading-none hover:bg-stone-100" aria-label="5 minutes more">
          +
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

function Overtime({ monthKey, id, initial, editable }: { monthKey: string; id: string; initial: number; editable: boolean }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  if (!editable) return <span>{value ? formatMinutes(value) : "—"}</span>;

  function save(next: number) {
    setValue(next);
    startTransition(async () => {
      await setOvertime(monthKey, id, next);
    });
  }
  const h = Math.floor(value / 60);
  const m = value % 60;
  return (
    <div className="flex gap-1">
      <select aria-label="Overtime hours" className={controlClass} value={h} disabled={pending} onChange={(e) => save(Number(e.target.value) * 60 + m)}>
        {Array.from({ length: 41 }, (_, i) => (
          <option key={i} value={i}>
            {i}h
          </option>
        ))}
      </select>
      <select aria-label="Overtime minutes" className={controlClass} value={m} disabled={pending} onChange={(e) => save(h * 60 + Number(e.target.value))}>
        {MINUTES.map((i) => (
          <option key={i} value={i}>
            {i}m
          </option>
        ))}
      </select>
    </div>
  );
}

export function WageRow(props: WageRowProps) {
  const { monthKey, id, editable, entries, totals } = props;
  const [, startTransition] = useTransition();
  const remove = (entryId: string) => () => startTransition(async () => void (await removeEntry(monthKey, entryId)));
  const sickHours = entries.filter((e) => e.kind === "sick_hours");
  const days = (kind: string) => entries.filter((e) => e.kind === kind);
  const [first, last] = [`${monthKey}-01`, `${monthKey}-31`];

  const dayList = (kind: "sick_day" | "holiday") => (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {days(kind).map((e) => (
          <Chip key={e.id} label={shortDate(e.date!)} onRemove={editable ? remove(e.id) : undefined} />
        ))}
        {!editable && !days(kind).length && "—"}
      </div>
      {editable && (
        <ActionForm action={addDay.bind(null, monthKey, id, kind)} submitLabel="Add" variant="secondary" className="flex flex-wrap items-center gap-1 [&_button]:py-1">
          <input type="date" name="date" min={first} max={last} required className={controlClass} aria-label="Date" />
        </ActionForm>
      )}
    </div>
  );

  return (
    <div className={`grid gap-4 border-b border-stone-100 py-4 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:min-w-max xl:gap-3 ${WAGE_GRID}`}>
      <div className="xl:sticky xl:left-0 xl:z-10 xl:bg-white">
        <p className="font-medium text-brand-800">{props.name}</p>
        <p className="text-xs text-stone-500">Contracted {formatMinutes(props.contracted)}</p>
        {props.notes.map((n) => (
          <p key={n} className="text-xs text-amber-800">
            {n}
          </p>
        ))}
        {props.noPattern && <p className="text-xs text-red-700">No shift pattern on their record</p>}
        {/* Totals sit with the name so they stay in view while the row scrolls. */}
        <div className="mt-2 rounded-lg bg-brand-50/60 p-2 text-xs leading-5">
          <p>
            Worked <strong className="tabular-nums">{formatMinutes(totals.worked)}</strong>
          </p>
          <p>
            Holiday <strong className="tabular-nums">{formatMinutes(totals.holiday)}</strong>
          </p>
          <p>
            SSP days <strong>{totals.sickDays.length}</strong> · Overtime <strong className="tabular-nums">{formatMinutes(totals.overtime)}</strong>
          </p>
          {totals.closurePending && <p className="text-amber-800">Closure choice needed</p>}
        </div>
      </div>

      <div>
        <Label>Extra minutes</Label>
        <ExtraMinutes monthKey={monthKey} id={id} initial={props.extraMinutes} editable={editable} />
      </div>

      <div className="space-y-1.5">
        <Label>Sick hours</Label>
        <div className="flex flex-wrap gap-1">
          {sickHours.map((e) => (
            <Chip key={e.id} label={`${formatMinutes(e.minutes!)}${e.date ? ` (${shortDate(e.date)})` : ""}`} onRemove={editable ? remove(e.id) : undefined} />
          ))}
          {!editable && !sickHours.length && "—"}
        </div>
        {editable && (
          <ActionForm action={addSickHours.bind(null, monthKey, id)} submitLabel="Add" variant="secondary" className="flex flex-wrap items-center gap-1 [&_button]:py-1">
            <select name="hours" aria-label="Sick hours" className={controlClass} defaultValue={0}>
              {HOURS.map((i) => (
                <option key={i} value={i}>
                  {i}h
                </option>
              ))}
            </select>
            <select name="minutes" aria-label="Sick minutes" className={controlClass} defaultValue={0}>
              {MINUTES.map((i) => (
                <option key={i} value={i}>
                  {i}m
                </option>
              ))}
            </select>
            <input type="date" name="date" min={first} max={last} className={controlClass} aria-label="Date (optional)" />
          </ActionForm>
        )}
      </div>

      <div>
        <Label>Sick days (SSP)</Label>
        {dayList("sick_day")}
      </div>

      <div>
        <Label>Holiday days</Label>
        {dayList("holiday")}
      </div>

      <div>
        <Label>Overtime</Label>
        <Overtime monthKey={monthKey} id={id} initial={props.overtimeMinutes} editable={editable} />
      </div>

      <div>
        <Label>Closure days</Label>
        {!props.hasClosureDays ? (
          <span className="text-stone-400">—</span>
        ) : editable ? (
          <select
            aria-label="Closure days"
            className={`${controlClass} ${props.closureAsHoliday === null ? "border-amber-400 bg-amber-50" : ""}`}
            defaultValue={props.closureAsHoliday === null ? "" : props.closureAsHoliday ? "holiday" : "unpaid"}
            onChange={(e) =>
              startTransition(async () => {
                const v = e.target.value;
                await setClosureChoice(monthKey, id, v === "" ? null : v === "holiday");
              })
            }
          >
            <option value="">Choose…</option>
            <option value="holiday">As holiday</option>
            <option value="unpaid">Unpaid</option>
          </select>
        ) : (
          <span>{props.closureAsHoliday ? "As holiday" : "Unpaid"}</span>
        )}
      </div>

    </div>
  );
}
