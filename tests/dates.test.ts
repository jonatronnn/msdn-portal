import { describe, expect, it } from "vitest";
import { formatLengthOfService, lengthOfService, todayInLondon, upcomingEvents, type EventEmployee } from "@/lib/dates";

const person = (overrides: Partial<EventEmployee>): EventEmployee => ({
  id: "1",
  first_name: "Sam",
  last_name: "Smith",
  date_of_birth: null,
  start_date: null,
  leave_date: null,
  ...overrides,
});

describe("lengthOfService", () => {
  it("counts whole months", () => {
    expect(lengthOfService("2020-03-15", "2026-10-08")).toEqual({ years: 6, months: 6 });
    expect(lengthOfService("2020-03-15", "2026-03-14")).toEqual({ years: 5, months: 11 });
    expect(lengthOfService("2020-03-15", "2026-03-15")).toEqual({ years: 6, months: 0 });
  });

  it("returns null before the start date", () => {
    expect(lengthOfService("2026-11-01", "2026-10-08")).toBeNull();
  });
});

describe("formatLengthOfService", () => {
  it("formats years and months", () => {
    expect(formatLengthOfService("2024-09-01", null, "2026-10-08")).toBe("2 yrs 1 mth");
    expect(formatLengthOfService("2026-09-01", null, "2026-10-08")).toBe("1 mth");
    expect(formatLengthOfService("2026-10-01", null, "2026-10-08")).toBe("0 mths");
    expect(formatLengthOfService("2025-10-08", null, "2026-10-08")).toBe("1 yr");
  });

  it("stops counting at the leave date", () => {
    expect(formatLengthOfService("2020-01-01", "2023-07-01", "2026-10-08")).toBe("3 yrs 6 mths");
  });

  it("handles future starters and missing dates", () => {
    expect(formatLengthOfService("2026-11-01", null, "2026-10-08")).toBe("Not started");
    expect(formatLengthOfService(null, null, "2026-10-08")).toBe("");
  });
});

describe("todayInLondon", () => {
  it("uses UK time, not UTC", () => {
    // 23:30 UTC on 8 Oct is 00:30 BST on 9 Oct.
    expect(todayInLondon(new Date("2026-10-08T23:30:00Z"))).toBe("2026-10-09");
    // In winter London is on UTC.
    expect(todayInLondon(new Date("2026-12-08T23:30:00Z"))).toBe("2026-12-08");
  });
});

describe("upcomingEvents", () => {
  it("finds birthdays, anniversaries, starters and leavers in the window", () => {
    const events = upcomingEvents(
      [
        person({ id: "a", first_name: "Ann", date_of_birth: "1990-10-10", start_date: "2020-10-12" }),
        person({ id: "b", first_name: "Ben", start_date: "2026-10-13" }),
        person({ id: "c", first_name: "Cat", start_date: "2019-01-01", leave_date: "2026-10-09" }),
        person({ id: "d", first_name: "Dan", date_of_birth: "1990-10-20" }),
      ],
      "2026-10-08",
      7,
    );
    expect(events.map((e) => [e.date, e.type, e.employeeId])).toEqual([
      ["2026-10-09", "leave", "c"],
      ["2026-10-10", "birthday", "a"],
      ["2026-10-12", "anniversary", "a"],
      ["2026-10-13", "start", "b"],
    ]);
    expect(events[2].label).toBe("6 years at the nursery");
  });

  it("does not count the first day as an anniversary", () => {
    const events = upcomingEvents([person({ start_date: "2026-10-08" })], "2026-10-08", 1);
    expect(events.map((e) => e.type)).toEqual(["start"]);
  });

  it("skips people who have left", () => {
    const events = upcomingEvents(
      [person({ date_of_birth: "1990-10-10", start_date: "2020-10-11", leave_date: "2026-01-01" })],
      "2026-10-08",
      7,
    );
    expect(events).toEqual([]);
  });

  it("wraps over the new year", () => {
    const events = upcomingEvents(
      [person({ id: "a", date_of_birth: "1990-01-02" }), person({ id: "b", date_of_birth: "1990-12-30" })],
      "2026-12-29",
      7,
    );
    expect(events.map((e) => e.date)).toEqual(["2026-12-30", "2027-01-02"]);
  });

  it("marks 29 February birthdays on 28 February in non-leap years", () => {
    expect(upcomingEvents([person({ date_of_birth: "1992-02-29" })], "2027-02-28", 1)).toHaveLength(1);
    expect(upcomingEvents([person({ date_of_birth: "1992-02-29" })], "2028-02-28", 1)).toHaveLength(0);
    expect(upcomingEvents([person({ date_of_birth: "1992-02-29" })], "2028-02-29", 1)).toHaveLength(1);
  });
});
