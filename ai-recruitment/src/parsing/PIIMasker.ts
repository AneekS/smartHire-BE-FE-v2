import crypto from "crypto";
import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import type { PIIMask } from "@/parsing/preprocess.types";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{10,15}/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const DOB_RE =
  /\b(?:DOB|Born|Date of Birth)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%-]+/gi;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+/gi;

export interface MaskResult {
  maskedText: string;
  piiMask: PIIMask;
}

function getEncryptionKey(): Buffer | null {
  const raw = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

export class PIIMasker {
  static mask(text: string): MaskResult {
    const piiMask: PIIMask = {};
    let maskedText = text;

    maskedText = maskedText.replace(EMAIL_RE, (match) => {
      if (!piiMask.email) piiMask.email = match;
      return "[EMAIL]";
    });

    maskedText = maskedText.replace(PHONE_RE, (match) => {
      if (!piiMask.phone) piiMask.phone = match;
      return "[PHONE]";
    });

    maskedText = maskedText.replace(SSN_RE, (match) => {
      if (!piiMask.ssn) piiMask.ssn = match;
      return "[SSN]";
    });

    maskedText = maskedText.replace(DOB_RE, (match) => {
      if (!piiMask.dob) piiMask.dob = match;
      return "[DOB]";
    });

    maskedText = maskedText.replace(LINKEDIN_RE, (match) => {
      if (!piiMask.linkedIn) piiMask.linkedIn = match;
      return "[LINKEDIN]";
    });

    maskedText = maskedText.replace(GITHUB_RE, (match) => {
      if (!piiMask.github) piiMask.github = match;
      return "[GITHUB]";
    });

    return { maskedText, piiMask };
  }

  static restore(
    schema: ExtractionResumeSchemaType,
    piiMask: PIIMask
  ): ExtractionResumeSchemaType {
    const restored = structuredClone(schema);

    if (piiMask.email) {
      if (!restored.personalInfo.email || restored.personalInfo.email === "[EMAIL]") {
        restored.personalInfo.email = piiMask.email;
      }
    }

    if (piiMask.phone) {
      if (!restored.personalInfo.phone || restored.personalInfo.phone === "[PHONE]") {
        restored.personalInfo.phone = piiMask.phone;
      }
    }

    if (piiMask.linkedIn) {
      if (!restored.personalInfo.linkedIn || restored.personalInfo.linkedIn === "[LINKEDIN]") {
        restored.personalInfo.linkedIn = piiMask.linkedIn;
      }
    }

    if (piiMask.github) {
      if (!restored.personalInfo.github || restored.personalInfo.github === "[GITHUB]") {
        restored.personalInfo.github = piiMask.github;
      }
    }

    return restored;
  }

  /** AES-256-GCM encrypt PIIMask for at-rest storage. */
  static encryptForStorage(mask: PIIMask): string | null {
    const key = getEncryptionKey();
    if (!key || Object.keys(mask).length === 0) return null;

    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const payload = JSON.stringify(mask);
    const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  static decryptFromStorage(encoded: string | null | undefined): PIIMask | null {
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
}
