import { describe, expect, it, beforeEach, vi } from "vitest";
import { ResumeScorer } from "@/scoring/scorer";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { parseJobSchema } from "@/models/job.schema";
import { parseResumeSchema } from "@/models/resume.schema";
import { weightedOverall, WEIGHT_PROFILES } from "@/scoring/weights";

vi.mock("@/embedding/embedder", () => ({
  embedText: vi.fn().mockResolvedValue({ vector: [0.1, 0.2, 0.3] }),
}));

vi.mock("@/retrieval/hybrid", () => ({
  hybridRetrieve: vi.fn().mockResolvedValue([
    {
      id: "c1",
      content: "Built APIs with Python",
      section: "EXPERIENCE_RECENT",
      score: 0.9,
      fusedScore: 0.05,
      resumeVersionId: "rv1",
      candidateId: "cand1",
      skills: ["Python"],
    },
  ]),
}));

vi.mock("@/embedding/search", () => ({
  isSearchConfigured: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/ollama-client", () => ({
  ollamaChat: vi.fn().mockResolvedValue("{}"),
  parseJsonFromModel: vi.fn().mockReturnValue({}),
}));

const resume = parseResumeSchema({
  fullName: "Alex Kim",
  yearsOfExperience: 6,
  seniorityBand: "L4",
  industryDomain: "TECH",
  skills: [
    {
      skillName: "Python",
      level: 4,
      lastUsedYear: 2025,
      yearsWithSkill: 5,
      domain: "BACKEND",
    },
    {
      skillName: "JavaScript",
      level: 3,
      lastUsedYear: 2024,
      yearsWithSkill: 4,
      domain: "FRONTEND",
    },
  ],
  experience: [
    {
      company: "Acme",
      title: "Senior Engineer",
      durationMonths: 36,
      isCurrent: true,
      achievements: [
        { description: "Increased revenue 20%", metricType: "%", metricValue: "20" },
      ],
    },
  ],
  education: [{ degree: "BS Computer Science", field: "", institution: "State U" }],
});

describe("ResumeScorer", () => {
  beforeEach(() => {
    SkillCanonicalizer.reset();
  });

  it("returns REJECT with capped score when dealbreaker fires", async () => {
    const jd = parseJobSchema({
      title: "Research Lead",
      roleType: "IC",
      dealbreakers: ["PhD required"],
      educationRequirement: "PHD",
      requiredSkills: [],
    });
    const scorer = new ResumeScorer();
    const result = await scorer.score(resume, jd, "cand1");
    expect(result.dealbreakers.length).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(30);
    expect(result.recommendation).toBe("REJECT");
  });

  it("produces full scoreBreakdown with six components", async () => {
    const jd = parseJobSchema({
      title: "Backend Engineer",
      roleType: "IC",
      seniorityExpected: "L4",
      requiredSkills: [
        { skillName: "Python", minLevel: 3, isMustHave: true },
        { skillName: "Go", minLevel: 2, isMustHave: false },
      ],
      minYearsExperience: 3,
      educationRequirement: "BACHELORS",
    });
    const scorer = new ResumeScorer();
    const result = await scorer.score(resume, jd, "cand1");
    expect(result.scoreBreakdown.semanticMatch).toBeDefined();
    expect(result.scoreBreakdown.skillMatch).toBeDefined();
    expect(result.scoreBreakdown.experienceMatch).toBeDefined();
    expect(result.scoreBreakdown.seniorityBand).toBeDefined();
    expect(result.scoreBreakdown.educationMatch).toBeDefined();
    expect(result.scoreBreakdown.achievementScore).toBeDefined();
    expect(result.matchedSkills).toContain("Python");
    expect(result.missingSkills).toContain("Go");
  });
});

describe("weightedOverall IC profile", () => {
  it("applies must-have penalty via low skill score in weighted sum", () => {
    const weights = WEIGHT_PROFILES.IC;
    const withPenalty = weightedOverall(
      {
        semanticMatch: 70,
        skillMatch: 40,
        experienceMatch: 80,
        seniorityBand: 100,
        educationMatch: 100,
        achievementScore: 70,
      },
      weights
    );
    const withoutPenalty = weightedOverall(
      {
        semanticMatch: 70,
        skillMatch: 90,
        experienceMatch: 80,
        seniorityBand: 100,
        educationMatch: 100,
        achievementScore: 70,
      },
      weights
    );
    expect(withPenalty).toBeLessThan(withoutPenalty);
  });
});
