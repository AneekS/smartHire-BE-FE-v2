import { describe, it, expect, vi, beforeEach } from "vitest";
import { HealthChecker } from "@/monitoring/HealthChecker";

vi.mock("@/monitoring/health-probes", () => ({
  getHealthSummary: vi.fn().mockResolvedValue({
    ok: true,
    db: "ok",
    redis: "ok",
    ollama_pool: { online: 2, offline: 0 },
    azure_search: "ok",
  }),
  getDetailedHealth: vi.fn().mockResolvedValue({
    ok: true,
    db: "ok",
    redis: "ok",
    ollama_pool: { online: 2, offline: 0 },
    azure_search: "ok",
    checkedAt: "2026-01-01T00:00:00.000Z",
  }),
  probeDatabase: vi.fn(),
  probeRedis: vi.fn(),
  probeOllamaPool: vi.fn(),
  probeAzureSearch: vi.fn(),
}));

vi.mock("@/monitoring/MetricsCollector", () => ({
  MetricsCollector: {
    getQueueMetrics: vi.fn().mockResolvedValue({
      embeddingQueueDepth: 5,
      deadLetterQueueCount: 0,
    }),
  },
}));

describe("HealthChecker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns summary from probes", async () => {
    const summary = await HealthChecker.getSummary();
    expect(summary.ok).toBe(true);
    expect(summary.db).toBe("ok");
  });

  it("includes queue metrics in detailed health", async () => {
    const detailed = await HealthChecker.getDetailed();
    expect(detailed.queue.embeddingQueueDepth).toBe(5);
    expect(detailed.checkedAt).toBeDefined();
  });

  it("maps API health body shape", async () => {
    const summary = await HealthChecker.getSummary();
    const body = HealthChecker.buildPublicHealthBody(summary);
    expect(body).toMatchObject({
      status: "healthy",
      prisma: "up",
      redis: "up",
      search: "up",
    });
  });
});
