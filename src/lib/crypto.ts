import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM encryption for small JSON values (bank details). The key is 32
// bytes, base64-encoded. Output: "v1:" + base64(iv | auth tag | ciphertext).

function keyBytes(keyBase64: string) {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) throw new Error("BANK_DETAILS_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function encryptJson(value: unknown, keyBase64: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(keyBase64), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return "v1:" + Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decryptJson<T>(encrypted: string, keyBase64: string): T {
  if (!encrypted.startsWith("v1:")) throw new Error("Unknown encryption format");
  const raw = Buffer.from(encrypted.slice(3), "base64");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(keyBase64), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
}
