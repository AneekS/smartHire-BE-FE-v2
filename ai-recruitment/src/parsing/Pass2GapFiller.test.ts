import { describe, it, expect } from "vitest";
import { shouldRunPass2 } from "@/parsing/pass-triggers";
import { emptyExtractionSchema } from "@/parsing/ExtractionSchema";
import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";

function filledSchema(avgConfidence: number): ExtractionResumeSchemaType {
  const schema = emptyExtractionSchema();
  schema.personalInfo = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "5551234567",
    location: null,
    linkedIn: null,
    github: null,
    portfolio: null,
  };
  schema.skills = [{ name: "TypeScript", domain: "BACKEND", proficiencyLevel: 4 }];
  schema.experience = [
    {
      company: "Acme",
      title: "Engineer",
      startDate: "2020-01",
      endDate: null,
      isCurrent: true,
      durationMonths: 48,
      responsibilities: ["Built APIs"],
      achievements: [],
      techStack: ["Node.js"],
    },
  ];
  schema.field_confidence = {
    personalInfo: avgConfidence,
    skills: avgConfidence,
    experience: avgConfidence,
    education: avgConfidence,
  };
  return schema;
}

describe("shouldRunPass2", () => {
  it("triggers when average confidence is below 0.75", () => {
    expect(shouldRunPass2(filledSchema(0.74))).toBe(true);
  });

  it("skips when average confidence is at or above 0.75 and required fields present", () => {
    expect(shouldRunPass2(filledSchema(0.8))).toBe(false);
  });

  it("triggers when required fields are missing even with high confidence", () => {
    const schema = filledSchema(0.9);
    schema.skills = [];
    expect(shouldRunPass2(schema)).toBe(true);
  });
});
