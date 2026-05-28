import { describe, it, expect } from "vitest";
import { classifyFormat } from "@/parsing/preprocessor";
import { normalizeText } from "@/parsing/document-extractor";
import type { SectionType } from "@/parsing/preprocess.types";

describe("classifyFormat", () => {
  it("detects INTERNATIONAL from CV header", () => {
    const type = classifyFormat("Curriculum Vitae\nExperience in India", {});
    expect(type).toBe("INTERNATIONAL");
  });

  it("detects ACADEMIC from publications", () => {
    const sections: Partial<Record<SectionType, string>> = {
      EXPERIENCE: "Research assistant",
    };
    const type = classifyFormat("Publications\nPeer-reviewed journal article", sections);
    expect(type).toBe("ACADEMIC");
  });

  it("detects FUNCTIONAL when skills dominate", () => {
    const sections: Partial<Record<SectionType, string>> = {
      SKILLS: "Python, SQL, Excel",
    };
    const type = classifyFormat("Skills-first resume with competencies", sections);
    expect(type).toBe("FUNCTIONAL");
  });

  it("defaults to STANDARD for typical resume", () => {
    const sections: Partial<Record<SectionType, string>> = {
      SUMMARY: "Engineer",
      EXPERIENCE: "Acme — 2020-2023",
      SKILLS: "TypeScript",
      EDUCATION: "BS CS",
    };
    const text = "Professional summary\nExperience at multiple companies with bullets and metrics over many words ".repeat(
      10
    );
    expect(classifyFormat(text, sections)).toBe("STANDARD");
  });
});

describe("normalizeText", () => {
  it("collapses excessive blank lines", () => {
    expect(normalizeText("a\n\n\n\nb")).toBe("a\n\nb");
  });
});
