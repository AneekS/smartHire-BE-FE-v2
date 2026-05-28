import { describe, it, expect } from "vitest";
import { PIIMasker } from "@/parsing/pii";
import { emptyExtractionSchema } from "@/models/extraction.schema";

describe("PIIMasker", () => {
  it("masks email and phone", () => {
    const text = "Contact jane@example.com or (555) 123-4567";
    const { maskedText, piiMask } = PIIMasker.mask(text);
    expect(maskedText).toContain("[EMAIL]");
    expect(maskedText).toContain("[PHONE]");
    expect(piiMask.email).toBe("jane@example.com");
    expect(piiMask.phone).toBe("(555) 123-4567");
  });

  it("masks SSN and DOB", () => {
    const text = "SSN 123-45-6789. DOB: 01/15/1990";
    const { maskedText, piiMask } = PIIMasker.mask(text);
    expect(maskedText).toContain("[SSN]");
    expect(maskedText).toContain("[DOB]");
    expect(piiMask.ssn).toBe("123-45-6789");
  });

  it("masks LinkedIn and GitHub URLs", () => {
    const text =
      "https://linkedin.com/in/jane-doe and https://github.com/janedoe";
    const { maskedText, piiMask } = PIIMasker.mask(text);
    expect(maskedText).toContain("[LINKEDIN]");
    expect(maskedText).toContain("[GITHUB]");
    expect(piiMask.linkedIn).toMatch(/linkedin\.com/i);
    expect(piiMask.github).toMatch(/github\.com/i);
  });

  it("restores PII into extraction schema personalInfo", () => {
    const schema = emptyExtractionSchema();
    schema.personalInfo.email = "[EMAIL]";
    schema.personalInfo.phone = "[PHONE]";

    const restored = PIIMasker.restore(schema, {
      email: "real@example.com",
      phone: "+1-555-999-0000",
    });

    expect(restored.personalInfo.email).toBe("real@example.com");
    expect(restored.personalInfo.phone).toBe("+1-555-999-0000");
  });
});
