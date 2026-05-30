import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptABTester } from "@/feedback/ab-testing";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promptAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    promptVariant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    extractionPromptAssignment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    extractionPromptVariant: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/ops-alerts", () => ({
  sendOpsAlert: vi.fn(),
}));

import { prisma } from "@/lib/prisma";

describe("PromptABTester", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hashBucket is deterministic for same resumeId", () => {
    const a = PromptABTester.hashBucket("resume-abc-123");
    const b = PromptABTester.hashBucket("resume-abc-123");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(100);
  });

  it("assignVariant returns existing assignment", async () => {
    vi.mocked(prisma.promptAssignment.findUnique).mockResolvedValue({
      resumeId: "r1",
      variantId: "control-broad-v1",
    } as never);
    vi.mocked(prisma.promptVariant.findUnique).mockResolvedValue({
      variantId: "control-broad-v1",
      promptText: "test prompt",
    } as never);

    const result = await PromptABTester.assignVariant("r1");
    expect(result?.variantId).toBe("control-broad-v1");
    expect(result?.source).toBe("legacy");
    expect(prisma.promptAssignment.create).not.toHaveBeenCalled();
  });

  it("assignVariant creates assignment from active variants", async () => {
    vi.mocked(prisma.promptAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.promptVariant.findMany).mockResolvedValue([
      { variantId: "control-broad-v1", trafficPercent: 50, active: true },
      { variantId: "variant-strict-v1", trafficPercent: 50, active: true },
    ] as never);
    vi.mocked(prisma.promptAssignment.create).mockResolvedValue({} as never);

    const variantId = await PromptABTester.assignVariant("resume-new-001");
    expect(variantId).toBeTruthy();
    expect(prisma.promptAssignment.create).toHaveBeenCalled();
  });

  it("runAnalytics does not promote with insufficient sample", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { variantId: "a", count: 50, acceptanceRate: 0.6 },
      { variantId: "b", count: 50, acceptanceRate: 0.4 },
    ] as never);

    const result = await PromptABTester.runAnalytics();
    expect(result.promoted).toBe(false);
    expect(prisma.promptVariant.update).not.toHaveBeenCalled();
  });
});
