import { MetricsCollector } from "@/monitoring/metrics";

export { MetricsCollector };

export async function buildDashboardPayload(days = 7) {
  return MetricsCollector.getDashboardData(days);
}
