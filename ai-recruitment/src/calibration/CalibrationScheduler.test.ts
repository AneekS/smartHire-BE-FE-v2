import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalibrationScheduler } from "@/calibration/CalibrationScheduler";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findMany: vi.fn() },
    recruiterDecision: { count: vi.fn() },
    weightRecalibrationRun: { findFirst: vi.fn() },
    weightCalibration: { findFirst: vi.fn() },
    dailyMetric: { upsert: vi.fn() },
  },
}));

vi.mock("@/calibration/WeightCalibrationEngine", () => ({
  WeightCalibrationEngine: {
    run: vi.fn().mockResolvedValue({ status: "INSUFFICIENT_DATA" }),
  },
}));

vi.mock("@/calibration/PromptABAnalyzer", () => ({
  PromptABAnalyzer: {
    analyze: vi.fn().mockResolvedValue({ tenantId: "t1", variants: [], winnerId: null }),
  },
}));

vi.mock("@/lib/ops-alerts", () => ({
  sendOpsAlert: vi.fn(),
}));

vi.mock("@/monitoring/logger", () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn() }),
}));

import { prisma } from "@/lib/prisma";
import { WeightCalibrationEngine } from "@/calibration/WeightCalibrationEngine";

describe("CalibrationScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.weightRecalibrationRun.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.weightCalibration.findFirst).mockResolvedValue(null);
  });

  it("skips tenants with fewer than 10 new decisions", async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([{ id: "t1" }] as never);
    vi.mocked(prisma.recruiterDecision.count).mockResolvedValue(5);

    const summary = await CalibrationScheduler.runWeekly();
    expect(summary.tenantsProcessed).toBe(0);
    expect(WeightCalibrationEngine.run).not.toHaveBeenCalled();
  });

  it("processes tenants with enough new decisions", async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([{ id: "t1" }] as never);
    vi.mocked(prisma.recruiterDecision.count)
      .mockResolvedValueOnce(15)
      .mockResolvedValue(15);

    const summary = await CalibrationScheduler.runWeekly();
    expect(summary.tenantsProcessed).toBe(1);
    expect(WeightCalibrationEngine.run).toHaveBeenCalled();
  });
});
