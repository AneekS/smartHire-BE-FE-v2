import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptABAnalyzer } from "@/calibration/PromptABAnalyzer";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    extractionPromptVariant: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    extractionEvent: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/ops-alerts", () => ({
  sendOpsAlert: vi.fn(),
}));

vi.mock("@/monitoring/logger", () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn() }),
}));

import { prisma } from "@/lib/prisma";

describe("PromptABAnalyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects winner by confidence and pass2 rate", async () => {
    vi.mocked(prisma.extractionPromptVariant.findMany).mockResolvedValue([
      { id: "v1", variantName: "control", isControl: true },
      { id: "v2", variantName: "candidate", isControl: false },
    ] as never);

    vi.mocked(prisma.extractionEvent.findMany)
      .mockResolvedValueOnce(
        Array.from({ length: 20 }, () => ({
          confidence: 0.7,
          finalConfidence: 0.72,
          pass2Triggered: true,
          pass3Triggered: false,
          zodRejected: false,
        })) as never
      )
      .mockResolvedValueOnce(
        Array.from({ length: 20 }, () => ({
          confidence: 0.85,
          finalConfidence: 0.88,
          pass2Triggered: false,
          pass3Triggered: false,
          zodRejected: false,
        })) as never
      );

    const result = await PromptABAnalyzer.analyze("tenant-1");
    expect(result.winnerId).toBe("v2");
    expect(result.confidenceLift).toBeGreaterThan(0.05);
    expect(result.promoted).toBe(true);
    expect(prisma.extractionPromptVariant.updateMany).toHaveBeenCalled();
  });
});
