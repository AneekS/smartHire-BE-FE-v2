import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth-middleware", () => ({
  withAuth: (_req: unknown, handler: (req: unknown) => Promise<Response>) =>
    handler({
      tenantId: "tenant-1",
      url: "http://localhost/api/v1/ats/industry-stats?industry=TECH",
    }),
}));

vi.mock("@/services/IndustryStatsService", () => ({
  IndustryStatsService: {
    getStats: vi.fn().mockResolvedValue({
      data: {
        industry: "TECH",
        seniorityBand: null,
        p25: 50,
        p50: 60,
        p75: 70,
        p90: 80,
        count: 10,
      },
      cached: false,
    }),
  },
}));

import { IndustryStatsService } from "@/services/IndustryStatsService";

describe("GET /api/v1/ats/industry-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to IndustryStatsService", async () => {
    const res = await GET({} as never);
    const json = await res.json();

    expect(IndustryStatsService.getStats).toHaveBeenCalledWith(
      "tenant-1",
      "TECH",
      undefined
    );
    expect(json.data.count).toBe(10);
    expect(json.meta.cached).toBe(false);
  });
});
