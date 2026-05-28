import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeightRecalibrator } from "@/feedback/retrainer";

vi.mock("@/lib/db", () => ({
  prisma: {
    recruiterDecision: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    tenantWeightProfile: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    weightRecalibrationRun: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ops-alerts", () => ({
  sendOpsAlert: vi.fn(),
}));

import { prisma } from "@/lib/db";

describe("WeightRecalibrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips recalibration when fewer than 50 decisions", async () => {
    vi.mocked(prisma.recruiterDecision.groupBy).mockResolvedValue([
      { tenantId: "tenant-1", _count: { id: 10 } },
    ] as never);

    vi.mocked(prisma.recruiterDecision.findMany).mockResolvedValue([]);

    const result = await WeightRecalibrator.recalibrateWeights();
    expect(result.profilesUpdated).toBe(0);
    expect(prisma.tenantWeightProfile.upsert).not.toHaveBeenCalled();
  });

  it("recalibrates when enough decisions exist", async () => {
    vi.mocked(prisma.recruiterDecision.groupBy).mockResolvedValue([
      { tenantId: "__global__", _count: { id: 60 } },
    ] as never);

    const decisions = Array.from({ length: 55 }, (_, i) => ({
      scoreBreakdown: {
        semanticMatch: { score: i % 2 === 0 ? 80 : 40 },
        skillMatch: { score: 70 },
        experienceMatch: { score: 60 },
        atsCompliance: { score: 50 },
        projectRelevance: { score: 45 },
        educationMatch: { score: 55 },
        resumeQuality: { score: 65 },
      },
      signalType: i % 2 === 0 ? "POSITIVE" : "NEGATIVE",
    }));

    vi.mocked(prisma.recruiterDecision.findMany).mockResolvedValue(decisions as never);
    vi.mocked(prisma.tenantWeightProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.tenantWeightProfile.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.weightRecalibrationRun.create).mockResolvedValue({} as never);

    const result = await WeightRecalibrator.recalibrateWeights();
    expect(result.profilesUpdated).toBeGreaterThan(0);
    expect(prisma.tenantWeightProfile.upsert).toHaveBeenCalled();
  });
});
