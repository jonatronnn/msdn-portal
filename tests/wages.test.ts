import { describe, expect, it } from "vitest";
import { calculateWages, contractedMinutes, decimalHours, formatMinutes, weekFor, type ShiftDay } from "@/lib/wages";

const day = (weekday: number, starts_at: string, ends_at: string, break_minutes: number | null = null, week: "A" | "B" = "A"): ShiftDay => ({
  week,
  weekday,
  starts_at,
  ends_at,
  break_minutes,
});

describe("contractedMinutes", () => {
  it("counts only working days from the start date, taking breaks off", () => {
    const pattern = {
      effective_from: "2026-01-01",
      week_a_from: null,
      days: [day(1, "08:00", "18:00", 60), day(2, "08:00:00", "18:00:00", 60), day(3, "08:00", "13:00")],
    };
    const result = contractedMinutes("2026-12", { start_date: "2026-12-08", leave_date: null }, [pattern]);
    expect(result["2026-12-01"]).toBeUndefined();
    expect(result["2026-12-08"]).toBe(540);
    expect(result["2026-12-09"]).toBe(300);
    expect(Object.keys(result)).toHaveLength(11);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(7 * 540 + 4 * 300);
  });

  it("stops after the leave date", () => {
    const pattern = { effective_from: "2026-01-01", week_a_from: null, days: [day(1, "09:00", "17:00")] };
    const result = contractedMinutes("2026-12", { start_date: null, leave_date: "2026-12-14" }, [pattern]);
    expect(Object.keys(result)).toEqual(["2026-12-07", "2026-12-14"]);
  });

  it("switches to a new pattern on the day it applies from", () => {
    const patterns = [
      { effective_from: "2026-01-01", week_a_from: null, days: [day(1, "09:00", "17:00")] },
      { effective_from: "2026-12-15", week_a_from: null, days: [day(5, "08:00", "12:00")] },
    ];
    expect(contractedMinutes("2026-12", { start_date: null, leave_date: null }, patterns)).toEqual({
      "2026-12-07": 480,
      "2026-12-14": 480,
      "2026-12-18": 240,
      "2026-12-25": 240,
    });
  });

  it("alternates week A and week B", () => {
    expect(weekFor("2026-11-30", "2026-12-02")).toBe("A");
    expect(weekFor("2026-12-07", "2026-12-02")).toBe("B");
    expect(weekFor("2026-11-23", "2026-12-02")).toBe("B");
    const pattern = {
      effective_from: "2026-01-01",
      week_a_from: "2026-12-02",
      days: [day(1, "09:00", "17:00", null, "A"), day(2, "09:00", "17:00", null, "B")],
    };
    const result = contractedMinutes("2026-12", { start_date: null, leave_date: null }, [pattern]);
    expect(Object.keys(result).sort()).toEqual(["2026-12-08", "2026-12-14", "2026-12-22", "2026-12-28"]);
  });
});

describe("calculateWages", () => {
  const contracted = {
    "2026-12-21": 540, // holiday
    "2026-12-22": 540, // sick day
    "2026-12-23": 540, // worked
    "2026-12-24": 540, // closure
    "2026-12-25": 540, // bank holiday
    "2026-12-29": 540, // closure
  };
  const entries = [
    { kind: "holiday" as const, date: "2026-12-21", minutes: null },
    { kind: "sick_day" as const, date: "2026-12-22", minutes: null },
    { kind: "sick_hours" as const, date: null, minutes: 90 },
  ];
  const closures = ["2026-12-24", "2026-12-29", "2026-12-30"];

  it("works out hours worked, holiday, SSP days and overtime", () => {
    const result = calculateWages(
      { contracted, extra_minutes: 25, overtime_minutes: 120, closure_as_holiday: true },
      entries,
      closures,
    );
    expect(result.contracted).toBe(3240);
    expect(result.worked).toBe(540 - 90 + 25);
    expect(result.holiday).toBe(540 * 4);
    expect(result.sickDays).toEqual(["2026-12-22"]);
    expect(result.overtime).toBe(120);
    expect(result.closurePending).toBe(false);
  });

  it("leaves closure days unpaid unless taken as holiday, and flags a missing choice", () => {
    const unpaid = calculateWages({ contracted, extra_minutes: 0, overtime_minutes: 0, closure_as_holiday: false }, entries, closures);
    expect(unpaid.holiday).toBe(540 * 2);
    expect(unpaid.worked).toBe(540 - 90);
    expect(unpaid.closurePending).toBe(false);

    const unchosen = calculateWages({ contracted, extra_minutes: 0, overtime_minutes: 0, closure_as_holiday: null }, entries, closures);
    expect(unchosen.closurePending).toBe(true);
  });
});

describe("formatting", () => {
  it("shows hours and minutes, and decimal hours for QuickBooks", () => {
    expect(formatMinutes(545)).toBe("9h 05m");
    expect(formatMinutes(-25)).toBe("−25m");
    expect(decimalHours(9105)).toBe("151.75");
  });
});
