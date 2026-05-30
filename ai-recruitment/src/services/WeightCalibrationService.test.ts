import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeightCalibrationService } from "@/services/WeightCalibrationService";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recruiterDecision: { findMany: vi.fn() },
    weightCalibration: { findFirst: vi.fn().mockResolvedValue(null) },
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

describe("WeightCalibrationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns INSUFFICIENT_DATA when hired/rejected below threshold", async () => {
    vi.mocked(prisma.recruiterDecision.findMany).mockResolvedValue([
      ...Array.from({ length: 5 }, () => ({ decision: "HIRED" })),
      ...Array.from({ length: 5 }, () => ({ decision: "REJECTED" })),
    ] as never);

    const result = await WeightCalibrationService.calibrate("tenant-1", "TECH");
    expect(result.status).toBe("INSUFFICIENT_DATA");
    if (result.status === "INSUFFICIENT_DATA") {
      expect(result.hired).toBe(5);
      expect(result.rejected).toBe(5);
    }
  });

  it("returns NOT_MEANINGFUL when discrimination power is low", async () => {
    const decisions = [
      ...Array.from({ length: 25 }, () => ({
        decision: "HIRED",
        scoreBreakdown: { overallScore: 72, semanticMatch: { score: 70 } },
        atsScoreAtDecision: 72,
      })),
      ...Array.from({ length: 25 }, () => ({
        decision: "REJECTED",
        scoreBreakdown: { overallScore: 70, semanticMatch: { score: 68 } },
        atsScoreAtDecision: 70,
      })),
    ];
    vi.mocked(prisma.recruiterDecision.findMany).mockResolvedValue(decisions as never);

    const result = await WeightCalibrationService.calibrate("tenant-1", "TECH");
    expect(result.status).toBe("NOT_MEANINGFUL");
  });

  it("returns SUCCESS and persists calibration on meaningful signal", async () => {
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
            id: "cal-1",
            calibrationVersion: 1,
          }),
        },
        weightRecalibrationRun: {
          create: vi.fn(),
        },
      };
      return fn(tx as never);
    });

    const result = await WeightCalibrationService.calibrate("tenant-1", "TECH");
    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      expect(result.calibrationId).toBe("cal-1");
      expect(result.discriminationPower).toBeGreaterThan(0.1);
    }
  });
});
