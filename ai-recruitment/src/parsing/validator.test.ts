import { describe, it, expect } from "vitest";
import { CrossFieldValidator } from "@/parsing/validator";
import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";

const baseSchema = (): ExtractionResumeSchemaType => ({
  personalInfo: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: null,
    location: null,
    linkedIn: null,
    github: null,
    portfolio: null,
  },
  summary: "Backend engineer",
  industryDomain: "TECH",
  seniorityBand: "L3",
  yearsOfExperience: 4,
  skills: [{ name: "React", domain: "OTHER", proficiencyLevel: 4 }],
  experience: [
    {
      company: "Acme",
      title: "Engineer",
      startDate: "2020-01",
      endDate: "2023-06",
      isCurrent: false,
      durationMonths: 42,
      responsibilities: [],
      achievements: ["Shipped feature X"],
      techStack: [],
    },
  ],
  education: [],
  projects: [],
  certifications: [],
  achievements: [],
  languages: [],
  field_confidence: {
    personalInfo: 0.9,
    experience: 0.85,
    skills: 0.8,
    seniorityBand: 0.85,
    yearsOfExperience: 0.85,
  },
});

describe("CrossFieldValidator", () => {
  it("corrects skill domain from name", () => {
    const result = CrossFieldValidator.validate(baseSchema());
    expect(result.resume.skills[0].domain).toBe("FRONTEND");
    expect(result.issues.some((i) => i.includes("Skill domain corrected"))).toBe(true);
  });

  it("corrects seniority mismatch", () => {
    const schema = baseSchema();
    schema.seniorityBand = "L1";
    schema.yearsOfExperience = 6;
    const result = CrossFieldValidator.validate(schema);
    expect(result.flags).toContain("SENIORITY_MISMATCH");
    expect(result.resume.seniorityBand).not.toBe("L1");
  });

  it("clears endDate when isCurrent is true", () => {
    const schema = baseSchema();
    schema.experience[0].isCurrent = true;
    schema.experience[0].endDate = "2023-06";
    const result = CrossFieldValidator.validate(schema);
    expect(result.resume.experience[0].endDate).toBeNull();
  });

  it("computes parseConfidence without fallback penalty", () => {
    const result = CrossFieldValidator.validate(baseSchema());
    expect(result.parseConfidence).toBeGreaterThanOrEqual(0.7);
    expect(result.parseConfidence).toBeLessThanOrEqual(1);
  });
});

describe("legacy validateResume", () => {
  it("still flags missing fullName", async () => {
    const { validateResume } = await import("@/parsing/validator");
    const { parseResumeSchema } = await import("@/models/resume.schema");
    const resume = parseResumeSchema({
      fullName: "",
      skills: [{ skillName: "TypeScript", domain: "FRONTEND", level: 3 }],
      experience: [],
    });
    const result = validateResume(resume);
    expect(result.lowConfidenceFields).toContain("fullName");
  });
});
