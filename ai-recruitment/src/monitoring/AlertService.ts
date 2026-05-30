import { prisma } from "@/lib/db";
import { sendOpsAlert } from "@/lib/ops-alerts";
import { trackEvent } from "@/monitoring/appInsights";
import { getLogger } from "@/monitoring/logger";
import { METRIC_KEYS, MetricsCollector } from "@/monitoring/MetricsCollector";

export interface AlertThreshold {
  alertType: string;
  metricKey: string;
  alertAbove?: number;
  alertBelow?: number;
  severity: "warning" | "critical";
}

/** Phase 6 spec thresholds. */
export const ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    alertType: "queue_depth",
    metricKey: METRIC_KEYS.QUEUE_DEPTH,
    alertAbove: 100,
    severity: "warning",
  },
  {
    alertType: "dlq_count",
    metricKey: METRIC_KEYS.DLQ_COUNT,
    alertAbove: 10,
    severity: "critical",
  },
  {
    alertType: "parse_error_rate",
    metricKey: METRIC_KEYS.PARSE_ERROR_RATE,
    alertAbove: 0.05,
    severity: "critical",
  },
  {
    alertType: "ollama_p95",
    metricKey: METRIC_KEYS.OLLAMA_P95_LATENCY,
    alertAbove: 30_000,
    severity: "warning",
  },
  {
    alertType: "zod_rejection_rate",
    metricKey: METRIC_KEYS.ZOD_REJECTION_RATE,
    alertAbove: 0.1,
    severity: "warning",
  },
];

const COOLDOWN_MS = 60 * 60 * 1000;

function isBreached(threshold: AlertThreshold, value: number): boolean {
  if (threshold.alertBelow != null && value < threshold.alertBelow) return true;
  if (threshold.alertAbove != null && value > threshold.alertAbove) return true;
  return false;
}

async function canFireAlert(alertType: string): Promise<boolean> {
  const row = await prisma.alertCooldown.findUnique({ where: { metricKey: alertType } });
  if (!row) return true;
  return Date.now() - row.lastFiredAt.getTime() >= COOLDOWN_MS;
}

async function markAlertFired(alertType: string): Promise<void> {
  await prisma.alertCooldown.upsert({
    where: { metricKey: alertType },
    create: { metricKey: alertType, lastFiredAt: new Date() },
    update: { lastFiredAt: new Date() },
  });
}

function resolveMetricValue(
  metrics: Array<{ metricKey: string; value: number; dimensions: unknown }>,
  metricKey: string,
  liveValues: Record<string, number>
): number | null {
  const row = metrics.find(
    (m) => m.metricKey === metricKey && !m.dimensions
  );
  if (row) return row.value;
  if (liveValues[metricKey] != null) return liveValues[metricKey];
  return null;
}

export class AlertService {
  static async checkAllAlerts(): Promise<{ fired: string[] }> {
    const log = getLogger();
    const fired: string[] = [];

    await MetricsCollector.computeDaily();
    await MetricsCollector.sampleQueueDepth();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const metrics = await prisma.dailyMetric.findMany({
      where: { date: today },
    });

    const queueMetrics = await MetricsCollector.getQueueMetrics();
    const liveValues: Record<string, number> = {
      [METRIC_KEYS.QUEUE_DEPTH]: queueMetrics.embeddingQueueDepth,
      [METRIC_KEYS.EMBEDDING_QUEUE_DEPTH]: queueMetrics.embeddingQueueDepth,
      [METRIC_KEYS.DLQ_COUNT]: queueMetrics.deadLetterQueueCount,
      [METRIC_KEYS.DEAD_LETTER_QUEUE_COUNT]: queueMetrics.deadLetterQueueCount,
    };

    for (const threshold of ALERT_THRESHOLDS) {
      const value = resolveMetricValue(metrics, threshold.metricKey, liveValues);
      if (value == null || !isBreached(threshold, value)) continue;
      if (!(await canFireAlert(threshold.alertType))) continue;

      log.warn({
        alert: true,
        alertType: threshold.alertType,
        metricKey: threshold.metricKey,
        value,
        alertAbove: threshold.alertAbove,
        alertBelow: threshold.alertBelow,
      });

      await sendOpsAlert({
        subject: `Alert: ${threshold.alertType}`,
        body: `${threshold.metricKey}=${value} breached threshold.`,
        severity: threshold.severity === "critical" ? "critical" : "warning",
      });

      trackEvent("alert_fired", {
        alertType: threshold.alertType,
        metricKey: threshold.metricKey,
        value: String(value),
      });

      await markAlertFired(threshold.alertType);
      fired.push(threshold.alertType);
    }

    return { fired };
  }
}

/** @deprecated Use AlertService */
export const AlertChecker = AlertService;
