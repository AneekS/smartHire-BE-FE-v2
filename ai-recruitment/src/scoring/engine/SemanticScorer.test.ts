import { describe, it, expect, vi } from "vitest";

vi.mock("@/scoring/engine/SemanticFallback", () => ({
  semanticFallbackScore: vi.fn().mockResolvedValue(null),
}));

import { scoreSemanticMatch } from "@/scoring/engine/SemanticScorer";
import type { ScoringContext } from "@/scoring/types";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { JobSchemaType } from "@/models/job.schema";

const resume: ResumeSchemaType = {
  fullName: "Jane",
  email: "j@t.com",
  phone: null,
  location: null,
  industryDomain: "TECH",
  summary: "TypeScript React engineer",
  currentTitle: "Engineer",
  skills: [{ skillName: "TypeScript", domain: "FRONTEND", level: 4 }],
  experience: [
    {
      company: "Co",
      title: "Dev",
      startDate: "2020-01",
      endDate: null,
      isCurrent: true,
      achievements: [{ description: "Built React apps" }],
    },
  ],
  education: [],
  parseConfidence: 0.9,
  field_confidence: {},
};

const job: JobSchemaType = {
  jobId: "j1",
  title: "React Developer",
  companyName: "TestCo",
  industryDomain: "TECH",
  roleType: "IC",
  educationRequirement: "BACHELORS",
  description: "TypeScript and React required",
  requiredSkills: [{ skillName: "React", minLevel: 3, isMustHave: true }],
  niceToHaveSkills: [],
  keyResponsibilities: ["Build UI"],
  mustHaveKeywords: ["react"],
  dealbreakers: [],
  responsibilities: [],
  requirements: [],
};

describe("SemanticScorer", () => {
  it("scores deterministically via hash vectors without network", async () => {
    const ctx: ScoringContext = {
      resume,
      job,
      candidateId: "c1",
      tenantId: "t1",
      resumeVersionId: "rv1",
    };
    const a = await scoreSemanticMatch(ctx);
    const b = await scoreSemanticMatch(ctx);
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThan(0);
    expect(a.reason).toMatch(/cosine|hash-vector|heuristic/i);
  });

  it("uses pre-computed vectors when provided", async () => {
    const dim = 4096;
    const vec = Array.from({ length: dim }, (_, i) => (i % 10) / 10);
    const ctx: ScoringContext = {
      resume,
      job,
      candidateId: "c1",
      tenantId: "t1",
      resumeVersionId: "rv1",
      resumeVectors: [{ section: "SKILLS", vector: vec }],
    };
    const result = await scoreSemanticMatch(ctx);
    expect(result.reason).toContain("pre-computed");
    expect(result.score).toBeGreaterThan(0);
  });
});
