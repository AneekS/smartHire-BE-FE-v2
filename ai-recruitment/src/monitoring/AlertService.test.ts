import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlertService, ALERT_THRESHOLDS } from "@/monitoring/AlertService";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyMetric: { findMany: vi.fn() },
    alertCooldown: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/monitoring/MetricsCollector", () => ({
  METRIC_KEYS: {
    QUEUE_DEPTH: "queue_depth",
    DLQ_COUNT: "dlq_count",
    PARSE_ERROR_RATE: "parse_error_rate",
    OLLAMA_P95_LATENCY: "ollama_p95_latency",
    ZOD_REJECTION_RATE: "zod_rejection_rate",
    EMBEDDING_QUEUE_DEPTH: "embedding_queue_depth",
    DEAD_LETTER_QUEUE_COUNT: "dead_letter_queue_count",
  },
  MetricsCollector: {
    computeDaily: vi.fn(),
    sampleQueueDepth: vi.fn(),
    getQueueMetrics: vi.fn().mockResolvedValue({
      embeddingQueueDepth: 150,
      deadLetterQueueCount: 0,
    }),
  },
}));

vi.mock("@/lib/ops-alerts", () => ({
  sendOpsAlert: vi.fn(),
}));

vi.mock("@/monitoring/appInsights", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/monitoring/logger", () => ({
  getLogger: () => ({ warn: vi.fn() }),
}));

import { prisma } from "@/lib/prisma";
import { sendOpsAlert } from "@/lib/ops-alerts";

describe("AlertService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.dailyMetric.findMany).mockResolvedValue([]);
    vi.mocked(prisma.alertCooldown.findUnique).mockResolvedValue(null);
  });

  it("uses Phase 6 spec thresholds", () => {
    const queue = ALERT_THRESHOLDS.find((t) => t.alertType === "queue_depth");
    expect(queue?.alertAbove).toBe(100);
  });

  it("fires queue_depth alert when live depth exceeds 100", async () => {
    const result = await AlertService.checkAllAlerts();
    expect(result.fired).toContain("queue_depth");
    expect(sendOpsAlert).toHaveBeenCalled();
  });

  it("respects cooldown", async () => {
    vi.mocked(prisma.alertCooldown.findUnique).mockResolvedValue({
      metricKey: "queue_depth",
      lastFiredAt: new Date(),
    } as never);

    const result = await AlertService.checkAllAlerts();
    expect(result.fired).not.toContain("queue_depth");
  });
});
