import { describe, expect, it } from "vitest";
import {
  formatNiNumber,
  formatPay,
  formatSortCode,
  missingEmploymentDetails,
  normaliseAccountNumber,
  normaliseNiNumber,
  normaliseSortCode,
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
    job_title: "Nursery practitioner",
    start_date: "2026-01-05",
    contract_type: "Permanent",
    contract_end_date: null,
    notice_period: "4 weeks",
    working_pattern: "Mon–Fri 8am–4pm",
    contracted_hours: 37.5,
    pay_rate: 12.6,
    pay_rate_basis: "hourly",
    qualification_level: "Level 3",
    qualification_date: "2020-07-01",
  };

  it("is empty when everything is filled in", () => {
    expect(missingEmploymentDetails(complete)).toEqual([]);
  });

  it("lists what's missing", () => {
    expect(missingEmploymentDetails({ ...complete, job_title: null, pay_rate_basis: null })).toEqual(["job title", "pay rate"]);
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
