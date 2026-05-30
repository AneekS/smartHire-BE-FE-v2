import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeightCalibrationEngine } from "@/calibration/WeightCalibrationEngine";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recruiterDecision: { findMany: vi.fn() },
    weightCalibration: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/services/NotificationService", () => ({
  NotificationService: {
    notifyCalibrationComplete: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/monitoring/appInsights", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/monitoring/logger", () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn() }),
}));

import { prisma } from "@/lib/prisma";

describe("WeightCalibrationEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("run returns previousWeights on SUCCESS", async () => {
    vi.mocked(prisma.weightCalibration.findFirst).mockResolvedValue({
      semanticWeight: 0.3,
      skillWeight: 0.25,
      experienceWeight: 0.15,
      complianceWeight: 0.1,
      projectWeight: 0.1,
      educationWeight: 0.05,
      qualityWeight: 0.05,
      calibrationVersion: 2,
    } as never);

    const decisions = [
      ...Array.from({ length: 25 }, () => ({
        decision: "HIRED",
        scoreBreakdown: {
          overallScore: 85,
          semanticMatch: { score: 90 },
          skillMatch: { score: 88 },
          experienceMatch: { score: 80 },
          atsCompliance: { score: 75 },
          projectRelevance: { score: 82 },
          educationMatch: { score: 70 },
          resumeQuality: { score: 78 },
        },
        atsScoreAtDecision: 85,
      })),
      ...Array.from({ length: 25 }, () => ({
        decision: "REJECTED",
        scoreBreakdown: {
          overallScore: 45,
          semanticMatch: { score: 40 },
          skillMatch: { score: 42 },
          experienceMatch: { score: 38 },
          atsCompliance: { score: 50 },
          projectRelevance: { score: 35 },
          educationMatch: { score: 55 },
          resumeQuality: { score: 48 },
        },
        atsScoreAtDecision: 45,
      })),
    ];
    vi.mocked(prisma.recruiterDecision.findMany).mockResolvedValue(decisions as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        weightCalibration: {
          updateMany: vi.fn(),
          create: vi.fn().mockResolvedValue({
            id: "cal-new",
            calibrationVersion: 3,
          }),
        },
        weightRecalibrationRun: { create: vi.fn() },
      };
      return fn(tx as never);
    });

    const result = await WeightCalibrationEngine.run("tenant-1", "TECH");
    expect(result.status).toBe("SUCCESS");
    expect(result.previousWeights?.semanticMatch).toBe(0.3);
    expect(result.calibrationVersion).toBe(3);
  });
});
