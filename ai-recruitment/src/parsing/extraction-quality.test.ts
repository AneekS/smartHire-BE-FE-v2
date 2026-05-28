import { describe, expect, test } from "vitest";
import { emptyExtractionSchema } from "@/models/extraction.schema";
import { isSparseExtraction } from "@/parsing/extraction-quality";
import { parseJsonFromModel } from "@/parsing/json-from-model";
import { enrichSparseExtraction } from "@/parsing/heuristic-enricher";

describe("isSparseExtraction", () => {
  test("flags empty extraction on rich resume text", () => {
    const schema = emptyExtractionSchema();
    schema.personalInfo.email = "a@b.com";
    const raw =
      `ANANYA MAHATO\nSoftware Developer at Finbox Jun 2024 - Present\n` +
      `Maintained credit-lending infrastructure with Go, PostgreSQL, Redis.\n`.repeat(8) +
      `EDUCATION\nIIT Kharagpur Dual Degree B.Tech 2019-2024 CGPA 8.47\n` +
      `SKILLS\nGo, PostgreSQL, Redis, Kubernetes\n`;
    expect(isSparseExtraction(schema, raw)).toBe(true);
  });

  test("accepts filled extraction", () => {
    const schema = emptyExtractionSchema();
    schema.personalInfo.name = "Ananya Mahato";
    schema.experience = [
      {
        company: "Finbox",
        title: "Software Developer",
        startDate: "2024-06",
        endDate: null,
        isCurrent: true,
        durationMonths: null,
        responsibilities: ["Built APIs"],
        achievements: [],
        techStack: ["Go"],
      },
    ];
    schema.education = [
      {
        institution: "IIT Kharagpur",
        degree: "B.Tech",
        field: null,
        startYear: 2019,
        endYear: 2024,
        gpa: 8.47,
      },
    ];
    schema.skills = [
      { name: "Go", domain: "BACKEND", proficiencyLevel: 4 },
      { name: "PostgreSQL", domain: "DATABASES", proficiencyLevel: 4 },
      { name: "Redis", domain: "DATABASES", proficiencyLevel: 3 },
    ];
    const raw = `ANANYA MAHATO\nFinbox\nIIT Kharagpur`;
    expect(isSparseExtraction(schema, raw)).toBe(false);
  });
});

describe("parseJsonFromModel", () => {
  test("strips think blocks and fences", () => {
    const raw = '```json\n{"personalInfo":{"name":"Ada"}}\n```';
    expect(parseJsonFromModel(raw)).toEqual({ personalInfo: { name: "Ada" } });
  });
});

describe("enrichSparseExtraction", () => {
  test("fills name from first line", () => {
    const schema = emptyExtractionSchema();
    const raw = "ANANYA MAHATO\nSoftware Developer\n6287752485 test@email.com";
    const out = enrichSparseExtraction(schema, raw);
    expect(out.personalInfo.name).toBe("ANANYA MAHATO");
    expect(out.personalInfo.email).toBe("test@email.com");
  });
});
