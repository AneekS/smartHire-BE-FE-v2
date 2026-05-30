import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recruiterDecision: { findMany: vi.fn().mockResolvedValue([]) },
    weightCalibration: { findFirst: vi.fn().mockResolvedValue(null) },
    job: { findFirst: vi.fn().mockResolvedValue({ id: "job-1" }) },
    jobListing: { findFirst: vi.fn().mockResolvedValue(null) },
    resumeVersionV2: {
      findUnique: vi.fn().mockResolvedValue({ id: "rv-v2-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    resume: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock("@/scoring/ATSEngine", () => ({
  ATSEngine: {
    compute: vi.fn(),
  },
}));

vi.mock("@/retrieval/hybrid", () => ({
  hybridRetrieve: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/embedding/embedder", () => ({
  embedText: vi.fn().mockResolvedValue({
    vector: [0.1, 0.2],
    dimensions: 2,
    source: "hash",
  }),
}));

vi.mock("@/embedding/search", () => ({
  isSearchConfigured: vi.fn().mockResolvedValue(false),
  buildSearchFilter: vi.fn().mockReturnValue(""),
}));

import { AtsEngineV3 } from "@/scoring/v3/ats-engine";
import { ATSEngine } from "@/scoring/ATSEngine";
import { computeFinalAts } from "@/scoring/v3/final-score";
import { INDUSTRY_WEIGHT_PROFILES } from "@/scoring/v3/industry-weights";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { JobSchemaType } from "@/models/job.schema";

const FIXED_YEAR = 2026;

const sampleResume: ResumeSchemaType = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: null,
  location: "NYC",
  currentTitle: "Software Engineer",
  yearsOfExperience: 5,
  seniorityBand: "L3",
  industryDomain: "TECH",
  skills: [
    { skillName: "TypeScript", domain: "FRONTEND", level: 4, lastUsedYear: 2025 },
    { skillName: "React", domain: "FRONTEND", level: 4, lastUsedYear: 2025 },
    { skillName: "Node.js", domain: "BACKEND", level: 3, lastUsedYear: 2024 },
  ],
  experience: [
    {
      company: "Acme",
      title: "Software Engineer",
      startDate: "2020-01",
      endDate: null,
      isCurrent: true,
      durationMonths: 60,
      achievements: [
        {
          description: "Built React dashboards serving 10k users",
          metricType: "users",
          metricValue: "10000",
        },
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor of Science",
      field: "Computer Science",
      institution: "State U",
      year: 2018,
    },
  ],
  summary: "Full-stack engineer with React and Node experience.",
  parseConfidence: 0.9,
  field_confidence: {},
};

const sampleJob: JobSchemaType = {
  jobId: "job-1",
  title: "Senior Software Engineer",
  companyName: "Target Co",
  description: "Build React and TypeScript applications.",
  industryDomain: "TECH",
  roleType: "IC",
  seniorityExpected: "L4",
  requiredSkills: [
    { skillName: "TypeScript", minLevel: 4, isMustHave: true },
    { skillName: "React", minLevel: 4, isMustHave: true },
  ],
  niceToHaveSkills: [{ skillName: "GraphQL", minLevel: 3 }],
  keyResponsibilities: ["Develop web applications", "Collaborate with product"],
  mustHaveKeywords: ["typescript", "react"],
  dealbreakers: [],
  educationRequirement: "BACHELORS",
  minYearsExperience: 3,
  maxYearsExperience: null,
  responsibilities: [],
  requirements: [],
};

const mockPersistedScore = {
  finalScore: 72,
  confidence: 0.88,
  requiresManualReview: false,
  industryProfile: "TECH",
  semanticScore: 70,
  skillScore: 80,
  experienceScore: 75,
  complianceScore: 85,
  projectScore: 60,
  educationScore: 90,
  qualityScore: 88,
  skillGaps: [{ missingSkill: "GraphQL" }],
  careerReadiness: {
    strengthAreas: ["TypeScript", "React"],
    developmentAreas: ["Develop proficiency in GraphQL"],
  },
  skillScoreReliable: true,
  percentileRank: 65,
  dealbreakers: ["Dealbreaker: missing required skill GraphQL"],
  dealbreakerCapApplied: true,
};

describe("AtsEngineV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ATSEngine.compute).mockResolvedValue(mockPersistedScore as never);
  });

  it("scoreGeneral is deterministic for the same resume", async () => {
    const a = await AtsEngineV3.scoreGeneral(sampleResume, 0.9, FIXED_YEAR);
    const b = await AtsEngineV3.scoreGeneral(sampleResume, 0.9, FIXED_YEAR);
    expect(a.overallScore).toBe(b.overallScore);
    expect(a.scoreBreakdown).toEqual(b.scoreBreakdown);
  });

  it("scoreForJob delegates to ATSEngine.compute and returns persisted finalScore", async () => {
    const opts = {
      tenantId: "tenant-1",
      jobId: "job-1",
      resumeVersionId: "rv-v2-1",
      skipNarrative: true,
    };
    const a = await AtsEngineV3.scoreForJob(
      sampleResume,
      sampleJob,
      "candidate-1",
      opts
    );
    const b = await AtsEngineV3.scoreForJob(
      sampleResume,
      sampleJob,
      "candidate-1",
      opts
    );

    expect(ATSEngine.compute).toHaveBeenCalledWith("rv-v2-1", "job-1", "tenant-1");
    expect(a.overallScore).toBe(72);
    expect(a.overallScore).toBe(b.overallScore);
    expect(a.pipeline).toBe("ats-v3");
    expect(a.dealbreakers).toEqual(mockPersistedScore.dealbreakers);
    expect(a.flags).toContain("DEALBREAKER_CAP_APPLIED");
    expect(a.percentileRank).toBe(65);
  });

  it("computeFinalAts uses all seven v3 components", () => {
    const components = {
      semanticMatch: 70,
      skillMatch: 80,
      experienceMatch: 75,
      atsCompliance: 85,
      projectRelevance: 60,
      educationMatch: 90,
      resumeQuality: 88,
    };
    const weights = INDUSTRY_WEIGHT_PROFILES.TECH;
    const first = computeFinalAts(components, weights, { parseConfidence: 0.9 });
    const second = computeFinalAts(components, weights, { parseConfidence: 0.9 });
    expect(first.overallScore).toBe(second.overallScore);
    expect(first.overallScore).toBeGreaterThan(0);
    expect(first.overallScore).toBeLessThanOrEqual(100);
  });
});
