import crypto from "crypto";
import { PIIMasker } from "@/parsing/PIIMasker";
import type { PIIMask } from "@/parsing/preprocess.types";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

function getKey(): Buffer | null {
  const raw = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as EncryptedPayload).iv === "string" &&
    typeof (value as EncryptedPayload).authTag === "string" &&
    typeof (value as EncryptedPayload).ciphertext === "string"
  );
}

export class PIIEncryption {
  static encrypt(plaintext: string): string {
    const key = getKey();
    if (!key) {
      throw new Error("PII_ENCRYPTION_KEY is not configured");
    }
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload: EncryptedPayload = {
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      ciphertext: encrypted.toString("base64"),
    };
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }

  static decrypt(encryptedString: string): string {
    const key = getKey();
    if (!key) {
      throw new Error("PII_ENCRYPTION_KEY is not configured");
    }

    try {
      const json = Buffer.from(encryptedString, "base64").toString("utf8");
      const payload = JSON.parse(json) as unknown;
      if (isEncryptedPayload(payload)) {
        const iv = Buffer.from(payload.iv, "base64");
        const authTag = Buffer.from(payload.authTag, "base64");
        const ciphertext = Buffer.from(payload.ciphertext, "base64");
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
      }
    } catch {
      /* fall through to legacy format */
    }

    const legacyMask = PIIMasker.decryptFromStorage(encryptedString);
    if (legacyMask) {
      return JSON.stringify(legacyMask);
    }
    throw new Error("Unable to decrypt PII payload");
  }

  static encryptMask(mask: PIIMask): string | null {
    if (Object.keys(mask).length === 0) return null;
    try {
      return PIIEncryption.encrypt(JSON.stringify(mask));
    } catch {
      return PIIMasker.encryptForStorage(mask);
    }
  }

  static decryptMask(encoded: string | null | undefined): PIIMask | null {
    if (!encoded?.trim()) return null;
    try {
      const plaintext = PIIEncryption.decrypt(encoded);
      return JSON.parse(plaintext) as PIIMask;
    } catch {
      return PIIMasker.decryptFromStorage(encoded);
    }
  }
}
