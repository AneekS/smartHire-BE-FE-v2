import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = {
  application: { upsert: vi.fn() },
  applicationAtsScore: {
    findUnique: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    aggregate: vi.fn().mockResolvedValue({ _avg: { finalScore: 72 } }),
  },
  dailyMetric: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  atsSkillGap: { deleteMany: vi.fn(), createMany: vi.fn() },
  careerReadiness: { delete: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resumeVersionV2: { findFirst: vi.fn() },
    job: { findFirst: vi.fn() },
    weightCalibration: { findFirst: vi.fn() },
    applicationAtsScore: { findMany: vi.fn().mockResolvedValue([]) },
    dailyMetric: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}));

vi.mock("@/scoring/engine/SemanticFallback", () => ({
  semanticFallbackScore: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/auth/AuditLogger", () => ({
  AuditLogger: {
    logWithClient: vi.fn(async (client, _action, _input) => {
      await client.auditLog.create({ data: { action: "ATS_SCORE_COMPUTED" } });
    }),
  },
}));

import { ATSEngine } from "@/scoring/ATSEngine";
import { prisma } from "@/lib/prisma";

describe("ATSEngine.compute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts Application and ApplicationAtsScore in transaction", async () => {
    vi.mocked(prisma.resumeVersionV2.findFirst).mockResolvedValue({
      id: "rv-v2",
      tenantId: "tenant-1",
      parseConfidence: 0.9,
      parsedResume: {
        parsedData: {
          fullName: "Jane",
          email: "j@t.com",
          skills: [{ skillName: "React", domain: "FRONTEND", level: 4 }],
          experience: [
            {
              company: "Co",
              title: "Dev",
              startDate: "2020-01",
              isCurrent: true,
              achievements: [{ description: "Shipped features" }],
            },
          ],
          education: [],
          parseConfidence: 0.9,
        },
        parseConfidence: 0.9,
      },
      resume: { candidateId: "candidate-1" },
      searchEmbedding: null,
    } as never);

    vi.mocked(prisma.job.findFirst).mockResolvedValue({
      id: "job-1",
      title: "Engineer",
      description: "React developer",
      requirements: "TypeScript",
      requiredSkills: ["React"],
      tenantId: "tenant-1",
      jobSkills: [],
    } as never);

    vi.mocked(prisma.weightCalibration.findFirst).mockResolvedValue(null);

    tx.application.upsert.mockResolvedValue({ id: "app-1" });
    tx.applicationAtsScore.findUnique.mockResolvedValue(null);
    tx.applicationAtsScore.create.mockResolvedValue({ id: "score-1" });
    tx.careerReadiness.create.mockResolvedValue({ id: "cr-1" });
    tx.dailyMetric.findFirst.mockResolvedValue(null);
    tx.applicationAtsScore.findUniqueOrThrow.mockResolvedValue({
      id: "score-1",
      finalScore: 72,
      skillGaps: [],
      careerReadiness: { strengthAreas: [], developmentAreas: [] },
      semanticScore: 70,
      skillScore: 80,
      experienceScore: 75,
      complianceScore: 85,
      projectScore: 60,
      educationScore: 90,
      qualityScore: 88,
      confidence: 0.9,
      requiresManualReview: false,
      industryProfile: "TECH",
    });

    const result = await ATSEngine.compute("rv-v2", "job-1", "tenant-1");

    expect(tx.application.upsert).toHaveBeenCalled();
    expect(tx.applicationAtsScore.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ATS_SCORE_COMPUTED" }),
      })
    );
    expect(result.id).toBe("score-1");
    expect(result.skillScoreReliable).toBeDefined();
    expect(result.dealbreakers).toBeDefined();
    expect(Array.isArray(result.dealbreakers)).toBe(true);
  });
});
