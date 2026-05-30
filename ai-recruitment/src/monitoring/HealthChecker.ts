import {
  getDetailedHealth as probeDetailed,
  getHealthSummary as probeSummary,
  type DetailedHealth,
  type HealthSummary,
  type ServiceStatus,
} from "@/monitoring/health-probes";
import { MetricsCollector } from "@/monitoring/MetricsCollector";

export type { ServiceStatus, HealthSummary, DetailedHealth };

export interface QueueMetrics {
  embeddingQueueDepth: number;
  deadLetterQueueCount: number;
}

export interface DetailedHealthWithQueue extends DetailedHealth {
  queue: QueueMetrics;
}

function mapStatus(status: ServiceStatus): string {
  if (status === "ok") return "up";
  if (status === "degraded") return "degraded";
  return "down";
}

export class HealthChecker {
  static async getSummary(): Promise<HealthSummary> {
    return probeSummary();
  }

  static async getDetailed(): Promise<DetailedHealthWithQueue> {
    const summary = await probeDetailed();
    const queue = await MetricsCollector.getQueueMetrics();
    return { ...summary, queue };
  }

  static mapStatusForApi(status: ServiceStatus): string {
    return mapStatus(status);
  }

  static buildPublicHealthBody(summary: HealthSummary, queue?: QueueMetrics) {
    const ollamaUp = summary.ollama_pool.online > 0;
    return {
      status: summary.ok ? "healthy" : "unhealthy",
      prisma: mapStatus(summary.db),
      redis: mapStatus(summary.redis),
      ollama: ollamaUp ? "up" : "down",
      search: mapStatus(summary.azure_search),
      ...(queue ? { queue } : {}),
    };
  }
}

export {
  probeDatabase,
  probeRedis,
  probeOllamaPool,
  probeAzureSearch,
  getHealthSummary,
  getDetailedHealth,
} from "@/monitoring/health-probes";
