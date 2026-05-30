import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RegexResumeParser } from "@/parsing/RegexResumeParser";
import { ExtractionResumeSchema } from "@/parsing/ExtractionSchema";

const FIXTURE = join(
  import.meta.dirname,
  "fixtures/resumes/tech_senior_engineer.txt"
);

describe("RegexResumeParser", () => {
  it("parses a fixture resume without Ollama", () => {
    const rawText = readFileSync(FIXTURE, "utf8");
    const schema = RegexResumeParser.parse(rawText);

    expect(schema.personalInfo.name).toBeTruthy();
    expect(schema.personalInfo.email).toMatch(/@/);
    expect(schema.skills.length).toBeGreaterThan(0);
    expect(ExtractionResumeSchema.safeParse(schema).success).toBe(true);
  });
});
