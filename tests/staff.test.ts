import { apprenticeRateEnds, hourlyPay } from "@/lib/pay";
import { describe, expect, it } from "vitest";
import {
  formatNiNumber,
  formatPay,
  formatSortCode,
  missingEmploymentDetails,
  nextPayrollId,
  normaliseAccountNumber,
  normaliseNiNumber,
  normaliseSortCode,
  sortStaff,
} from "@/lib/staff";

describe("normaliseNiNumber", () => {
  it("accepts spaces and lower case", () => {
    expect(normaliseNiNumber("jk 12 34 56 c")).toBe("JK123456C");
    expect(normaliseNiNumber("AB123456D")).toBe("AB123456D");
  });

  it("rejects invalid numbers", () => {
    expect(normaliseNiNumber("QQ123456C")).toBeNull(); // HMRC's example, never issued
    expect(normaliseNiNumber("AB123456E")).toBeNull(); // suffix must be A–D
    expect(normaliseNiNumber("AB12345C")).toBeNull(); // too short
    expect(normaliseNiNumber("DA123456A")).toBeNull(); // D can't be first
    expect(normaliseNiNumber("AO123456A")).toBeNull(); // O can't be second
    expect(normaliseNiNumber("GB123456A")).toBeNull(); // unused prefix
    expect(normaliseNiNumber("")).toBeNull();
  });
});

describe("formatNiNumber", () => {
  it("adds the usual spacing", () => {
    expect(formatNiNumber("JK123456C")).toBe("JK 12 34 56 C");
    expect(formatNiNumber(null)).toBe("");
  });
});

describe("missingEmploymentDetails", () => {
  const complete = {
    job_title: "Practitioner",
    start_date: "2026-01-05",
    contract_type: "Permanent",
    contract_end_date: null,
    notice_period: "4 weeks",
    working_pattern: "Mon–Fri 8am–4pm",
    contracted_hours: 37.5,
    pay_rate: null,
    pay_rate_basis: null,
    qualification_level: "Level 3",
    qualification_date: "2020-07-01",
    apprenticeship_start_date: null,
  };

  it("is empty when everything is filled in", () => {
    expect(missingEmploymentDetails(complete)).toEqual([]);
  });

  it("lists what's missing", () => {
    expect(missingEmploymentDetails({ ...complete, job_title: null, notice_period: null })).toEqual(["job title", "notice period"]);
    expect(missingEmploymentDetails({ ...complete, job_title: "Manager" })).toEqual(["salary"]);
    expect(missingEmploymentDetails({ ...complete, job_title: "Apprentice" })).toEqual(["apprenticeship start date"]);
  });

  it("needs an end date for fixed-term contracts", () => {
    expect(missingEmploymentDetails({ ...complete, contract_type: "Fixed-term" })).toEqual(["contract end date"]);
  });

  it("needs a qualification date unless unqualified", () => {
    expect(missingEmploymentDetails({ ...complete, qualification_date: null })).toEqual(["qualification date"]);
    expect(missingEmploymentDetails({ ...complete, qualification_level: "Unqualified", qualification_date: null })).toEqual([]);
  });
});

describe("bank details", () => {
  it("normalises sort codes and account numbers", () => {
    expect(normaliseSortCode("12-34-56")).toBe("123456");
    expect(normaliseSortCode("12 34 56")).toBe("123456");
    expect(normaliseSortCode("12345")).toBeNull();
    expect(normaliseAccountNumber("12345678")).toBe("12345678");
    expect(normaliseAccountNumber("1234567")).toBe("01234567");
    expect(normaliseAccountNumber("123456789")).toBeNull();
    expect(formatSortCode("123456")).toBe("12-34-56");
  });

  it("formats pay", () => {
    expect(formatPay(12.6, "hourly")).toBe("£12.60 per hour");
    expect(formatPay(28000, "annual")).toBe("£28,000.00 per year");
    expect(formatPay(null, "hourly")).toBe("");
  });
});

describe("nextPayrollId", () => {
  it("starts at 070", () => {
    expect(nextPayrollId([])).toBe("070");
    expect(nextPayrollId([null, "012"])).toBe("070");
  });
  it("follows the highest number", () => {
    expect(nextPayrollId(["070", "075", "071"])).toBe("076");
    expect(nextPayrollId(["999"])).toBe("1000");
  });
  it("reads older PR-style IDs and ignores other formats", () => {
    expect(nextPayrollId(["PR080", "07X", "A12"])).toBe("081");
  });
});
describe("sortStaff", () => {
  const today = "2026-11-27";
  const row = (first_name: string, last_name: string, job_title: string | null, start_date: string | null, payroll_id: string | null = null) => ({
    payroll_id,
    first_name,
    last_name,
    job_title,
    start_date,
    leave_date: null,
    leave_reason: null,
  });
  const rows = [
    row("Amy", "Smith", "Room leader", "2020-03-01"),
    row("Ben", "adams", null, "2025-06-15"),
    row("Cat", "Smith", "Apprentice", null),
  ];
  const names = (r: typeof rows) => r.map((e) => e.first_name);

  it("sorts by surname then first name, ignoring case", () => {
    expect(names(sortStaff(rows, "name", "asc", today))).toEqual(["Ben", "Amy", "Cat"]);
    expect(names(sortStaff(rows, "name", "desc", today))).toEqual(["Cat", "Amy", "Ben"]);
  });

  it("puts blanks last in either direction", () => {
    expect(names(sortStaff(rows, "job_title", "asc", today))).toEqual(["Cat", "Amy", "Ben"]);
    expect(names(sortStaff(rows, "job_title", "desc", today))).toEqual(["Amy", "Cat", "Ben"]);
    expect(names(sortStaff(rows, "start_date", "desc", today))).toEqual(["Ben", "Amy", "Cat"]);
  });

  it("sorts employee IDs by their number", () => {
    const ids = [row("A", "A", null, null, "100"), row("B", "B", null, null, "070"), row("C", "C", null, null, null)];
    expect(names(sortStaff(ids, "payroll_id", "asc", today))).toEqual(["B", "A", "C"]);
  });

  it("sorts by length of service and next anniversary", () => {
    expect(names(sortStaff(rows, "service", "asc", today))).toEqual(["Ben", "Amy", "Cat"]);
    // Amy's 10 years falls on 1 Mar 2030, Ben's 5 years on 15 Jun 2030.
    expect(names(sortStaff(rows, "anniversary", "asc", today))).toEqual(["Amy", "Ben", "Cat"]);
  });
});

describe("hourlyPay", () => {
  const rates = {
    under_18: 8,
    age_18_unqualified: 10.85,
    age_18_level_2: 10.92,
    age_21_unqualified: 12.71,
    age_21_level_2: 12.85,
    age_21_level_3: 12.97,
    room_leader: 13.12,
    senior: 13.34,
    dsl_extra: 0.5,
    senco_extra: 0.25,
  };
  const person = (o: Partial<Parameters<typeof hourlyPay>[0]>) => ({
    job_title: "Practitioner",
    qualification_level: null,
    date_of_birth: "2000-06-15",
    is_dsl: false,
    is_senco: false,
    apprenticeship_start_date: null,
    ...o,
  });
  const today = "2026-11-27";
  const rate = (o: Partial<Parameters<typeof hourlyPay>[0]>, on = today) => {
    const pay = hourlyPay(person(o), rates, on);
    return pay && "rate" in pay ? pay.rate : pay;
  };

  it("uses age and qualification level", () => {
    expect(rate({ qualification_level: "Level 3" })).toBe(12.97);
    expect(rate({ qualification_level: "Level 2" })).toBe(12.85);
    expect(rate({})).toBe(12.71);
    expect(rate({ date_of_birth: "2007-01-01", qualification_level: "Level 3" })).toBe(10.92);
    expect(rate({ date_of_birth: "2007-01-01" })).toBe(10.85);
    expect(rate({ date_of_birth: "2010-01-01" })).toBe(8);
  });
  it("moves up a band on the birthday", () => {
    expect(rate({ date_of_birth: "2005-11-28" })).toBe(10.85);
    expect(rate({ date_of_birth: "2005-11-28" }, "2026-11-28")).toBe(12.71);
  });
  it("uses flat rates by job title and adds DSL and SENCo", () => {
    expect(rate({ job_title: "Room Leader", date_of_birth: null })).toBe(13.12);
    expect(rate({ job_title: "Senior Practitioner", is_dsl: true, is_senco: true })).toBe(14.09);
    expect(rate({ job_title: "Apprentice", date_of_birth: "1990-01-01" })).toBe(8);
  });
  it("moves apprentices to the age rate at 19 after their first year", () => {
    const apprentice = { job_title: "Apprentice", date_of_birth: "2007-03-01", apprenticeship_start_date: "2026-01-10" };
    expect(apprenticeRateEnds(apprentice)).toBe("2027-01-10");
    expect(rate(apprentice, "2027-01-09")).toBe(8);
    expect(rate(apprentice, "2027-01-10")).toBe(10.85);
    expect(apprenticeRateEnds({ date_of_birth: "2009-03-01", apprenticeship_start_date: "2026-01-10" })).toBe("2028-03-01");
  });
  it("has no hourly rate for managers and directors", () => {
    expect(rate({ job_title: "Manager" })).toBeNull();
    expect(rate({ job_title: "Deputy Manager" })).toBeNull();
    expect(rate({ job_title: "Director" })).toBeNull();
  });
  it("needs a date of birth for age-based rates", () => {
    expect(hourlyPay(person({ date_of_birth: null }), rates, today)).toEqual({ missing: "date of birth" });
  });
});
