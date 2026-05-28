import crypto from "crypto";
import type { PIIMask } from "@/parsing/preprocess.types";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getEncryptionKey(): Buffer | null {
  const raw = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypt PIIMask for at-rest storage (never log or embed). */
export function encryptPiiMask(mask: PIIMask): string | null {
  const key = getEncryptionKey();
  if (!key || Object.keys(mask).length === 0) return null;

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const payload = JSON.stringify(mask);
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Decrypt PIIMask from DB column. */
export function decryptPiiMask(encoded: string | null | undefined): PIIMask | null {
  if (!encoded?.trim()) return null;
  const key = getEncryptionKey();
  if (!key) return null;

  try {
    const buf = Buffer.from(encoded, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + 16);
    const data = buf.subarray(IV_LEN + 16);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(json) as PIIMask;
  } catch {
    return null;
  }
}
