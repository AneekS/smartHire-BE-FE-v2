import { describe, it, expect } from "vitest";
import { SectionDetector } from "@/parsing/section-detector";

describe("SectionDetector", () => {
  it("detects standard section headers", () => {
    const text = `Jane Doe
jane@example.com

SUMMARY
Backend engineer with 6 years experience.

EXPERIENCE
Acme Corp — Engineer — 2020-2023

SKILLS
Node.js, PostgreSQL

EDUCATION
BS Computer Science — UC Berkeley`;

    const sections = SectionDetector.detect(text);
    expect(sections.SUMMARY).toContain("Backend engineer");
    expect(sections.EXPERIENCE).toContain("Acme Corp");
    expect(sections.SKILLS).toContain("Node.js");
    expect(sections.EDUCATION).toContain("UC Berkeley");
  });

  it("detects markdown-style DOCX headings", () => {
    const text = `## Professional Summary
Experienced developer.

## Work Experience
Company A — 2021-Present`;

    const sections = SectionDetector.detect(text);
    expect(sections.SUMMARY).toContain("Experienced developer");
    expect(sections.EXPERIENCE).toContain("Company A");
  });
});
