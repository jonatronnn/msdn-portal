import { describe, expect, it } from "vitest";
import { addMonths, formatLengthOfService, formatTimeUntil, lengthOfService, nextMilestone, todayInLondon } from "@/lib/dates";

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

describe("nextMilestone", () => {
  it("finds the next 1, 5, 10, 15 or 20 year anniversary", () => {
    expect(nextMilestone("2026-03-01", "2026-11-10")).toEqual({ years: 1, date: "2027-03-01" });
    expect(nextMilestone("2023-01-15", "2026-11-10")).toEqual({ years: 5, date: "2028-01-15" });
    expect(nextMilestone("2021-11-10", "2026-11-10")).toEqual({ years: 5, date: "2026-11-10" });
    expect(nextMilestone("2008-06-01", "2026-11-10")).toEqual({ years: 20, date: "2028-06-01" });
  });

  it("returns null after 20 years", () => {
    expect(nextMilestone("2004-01-01", "2026-11-10")).toBeNull();
  });

  it("uses 28 February for 29 February starters in non-leap years", () => {
    expect(nextMilestone("2024-02-29", "2024-03-01")).toEqual({ years: 1, date: "2025-02-28" });
  });

  it("counts from the start date for future starters", () => {
    expect(nextMilestone("2027-01-05", "2026-11-10")).toEqual({ years: 1, date: "2028-01-05" });
  });
});

describe("formatTimeUntil", () => {
  it("describes how long until a date", () => {
    expect(formatTimeUntil("2026-11-10", "2026-11-10")).toBe("today");
    expect(formatTimeUntil("2026-11-10", "2026-11-11")).toBe("in 1 day");
    expect(formatTimeUntil("2026-11-10", "2026-12-01")).toBe("in 21 days");
    expect(formatTimeUntil("2026-11-10", "2027-02-15")).toBe("in 3 mths");
    expect(formatTimeUntil("2026-11-10", "2028-01-15")).toBe("in 1 yr 2 mths");
  });
});

describe("addMonths", () => {
  it("adds months, keeping to the end of shorter months", () => {
    expect(addMonths("2026-11-10", 36)).toBe("2029-11-10");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
});
