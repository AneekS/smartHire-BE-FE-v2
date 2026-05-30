import { describe, it, expect } from "vitest";
import { shouldRunPass3 } from "@/parsing/pass-triggers";
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
  schema.seniorityBand = "L3";
  schema.yearsOfExperience = 4;
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

describe("shouldRunPass3", () => {
  it("triggers when post-pass2 confidence is below 0.85", () => {
    expect(shouldRunPass3(filledSchema(0.84))).toBe(true);
  });

  it("skips when confidence is at or above 0.85 with no critical conflicts", () => {
    expect(shouldRunPass3(filledSchema(0.9))).toBe(false);
  });

  it("triggers on seniority mismatch even when confidence is high", () => {
    const schema = filledSchema(0.95);
    schema.seniorityBand = "L1";
    schema.yearsOfExperience = 10;
    expect(shouldRunPass3(schema)).toBe(true);
  });
});
