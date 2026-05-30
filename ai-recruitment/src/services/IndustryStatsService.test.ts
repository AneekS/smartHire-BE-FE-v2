import { describe, it, expect, vi, beforeEach } from "vitest";
import { IndustryStatsService } from "@/services/IndustryStatsService";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyMetric: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  getRedisClient: vi.fn(() => null),
}));

import { prisma } from "@/lib/prisma";

describe("IndustryStatsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes percentiles over 6-month window", async () => {
    vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([
      { value: 40, metricValue: 40 },
      { value: 60, metricValue: 60 },
      { value: 80, metricValue: 80 },
    ] as never);

    const { data, cached } = await IndustryStatsService.getStats("tenant-1", "TECH", "L3");

    expect(cached).toBe(false);
    expect(data.count).toBe(3);
    expect(data.industry).toBe("TECH");
    expect(data.seniorityBand).toBe("L3");
    expect(prisma.dailyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          domain: "TECH",
          dimension1: "L3",
        }),
      })
    );
  });

  it("builds stable cache keys", () => {
    expect(IndustryStatsService.cacheKey("t1", "TECH", "L4")).toBe(
      "industry-stats:t1:TECH:L4"
    );
    expect(IndustryStatsService.cacheKey("t1")).toBe("industry-stats:t1:all:all");
  });
});
