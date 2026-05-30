import { describe, it, expect } from "vitest";
import { SectionChunker, CHUNK_SECTION_WEIGHTS } from "@/embedding/SectionChunker";
import { emptyExtractionSchema } from "@/parsing/ExtractionSchema";

describe("SectionChunker", () => {
  it("applies spec section weights", () => {
    expect(CHUNK_SECTION_WEIGHTS.EXPERIENCE).toBe(1.5);
    expect(CHUNK_SECTION_WEIGHTS.SKILLS).toBe(1.3);
    expect(CHUNK_SECTION_WEIGHTS.EDUCATION).toBe(1.0);
    expect(CHUNK_SECTION_WEIGHTS.SUMMARY).toBe(1.1);
    expect(CHUNK_SECTION_WEIGHTS.PROJECTS).toBe(1.2);
  });

  it("emits a projects chunk when projects exist", () => {
    const schema = emptyExtractionSchema();
    schema.skills = [{ name: "React", domain: "FRONTEND", proficiencyLevel: 4 }];
    schema.projects = [
      {
        name: "Portfolio Site",
        description: "Personal portfolio",
        impact: "Increased traffic",
        techStack: ["Next.js"],
        url: null,
      },
    ];

    const chunks = SectionChunker.chunk(
      "Portfolio Site built with Next.js",
      schema,
      "rv1",
      "cand1",
      "tenant1"
    );

    const projects = chunks.filter((c) => c.section === "PROJECTS");
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].weight).toBe(1.2);
  });

  it("assigns experience weight 1.5 to experience chunks", () => {
    const schema = emptyExtractionSchema();
    schema.skills = [{ name: "Go", domain: "BACKEND", proficiencyLevel: 3 }];
    schema.experience = [
      {
        company: "Corp",
        title: "Dev",
        startDate: "2021-01",
        endDate: "2023-06",
        isCurrent: false,
        durationMonths: 30,
        responsibilities: ["API work"],
        achievements: [],
        techStack: ["Go"],
      },
    ];

    const chunks = SectionChunker.chunk("Corp Dev API work", schema, "rv1", "c1");
    const exp = chunks.find((c) => c.section === "EXPERIENCE");
    expect(exp?.weight).toBe(1.5);
  });
});
