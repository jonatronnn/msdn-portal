import { describe, expect, it } from "vitest";
import { matchPayrollId } from "@/lib/payslips";

const staff = [
  { id: "a", payroll_id: "P42" },
  { id: "b", payroll_id: "P420" },
  { id: "c", payroll_id: "EMP-7" },
  { id: "d", payroll_id: null },
];

describe("matchPayrollId", () => {
  it("matches the payroll ID as a whole word", () => {
    expect(matchPayrollId("Payslip_P42_2026-09.pdf", staff)?.id).toBe("a");
    expect(matchPayrollId("p420 September.PDF", staff)?.id).toBe("b");
    expect(matchPayrollId("EMP-7.pdf", staff)?.id).toBe("c");
  });

  it("returns null when nothing or more than one employee matches", () => {
    expect(matchPayrollId("Payslip_P4200.pdf", staff)).toBeNull();
    expect(matchPayrollId("P42 and P420.pdf", staff)).toBeNull();
    expect(matchPayrollId("September.pdf", staff)).toBeNull();
  });
});
