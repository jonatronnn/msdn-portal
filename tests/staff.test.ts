import { describe, expect, it } from "vitest";
import { formatNiNumber, normaliseNiNumber } from "@/lib/staff";

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
