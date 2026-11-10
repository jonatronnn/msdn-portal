import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson } from "@/lib/crypto";

const key = randomBytes(32).toString("base64");
const details = { accountName: "S Starter", sortCode: "123456", accountNumber: "12345678" };

describe("bank details encryption", () => {
  it("round-trips and never stores the plain text", () => {
    const encrypted = encryptJson(details, key);
    expect(encrypted).not.toContain("12345678");
    expect(decryptJson(encrypted, key)).toEqual(details);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptJson(details, key)).not.toBe(encryptJson(details, key));
  });

  it("rejects the wrong key or a tampered value", () => {
    const encrypted = encryptJson(details, key);
    expect(() => decryptJson(encrypted, randomBytes(32).toString("base64"))).toThrow();
    const tampered = encrypted.slice(0, -4) + (encrypted.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => decryptJson(tampered, key)).toThrow();
  });

  it("rejects a key that isn't 32 bytes", () => {
    expect(() => encryptJson(details, randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });
});
