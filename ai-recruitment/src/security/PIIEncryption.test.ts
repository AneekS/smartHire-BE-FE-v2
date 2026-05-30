import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PIIEncryption } from "@/security/PIIEncryption";
import { PIIMasker } from "@/parsing/PIIMasker";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("PIIEncryption", () => {
  beforeEach(() => {
    process.env.PII_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.PII_ENCRYPTION_KEY;
  });

  it("round-trips plaintext with JSON envelope", () => {
    const encrypted = PIIEncryption.encrypt('{"email":"test@example.com"}');
    const decrypted = PIIEncryption.decrypt(encrypted);
    expect(decrypted).toBe('{"email":"test@example.com"}');
  });

  it("encryptMask and decryptMask round-trip PIIMask", () => {
    const mask = { email: "user@example.com", phone: "555-0100" };
    const encoded = PIIEncryption.encryptMask(mask);
    expect(encoded).toBeTruthy();
    expect(PIIEncryption.decryptMask(encoded)).toEqual(mask);
  });

  it("decrypt falls back to legacy PIIMasker blob", () => {
    const legacy = PIIMasker.encryptForStorage({ email: "legacy@example.com" });
    expect(legacy).toBeTruthy();
    const decrypted = PIIEncryption.decrypt(legacy!);
    expect(JSON.parse(decrypted)).toEqual({ email: "legacy@example.com" });
  });
});
