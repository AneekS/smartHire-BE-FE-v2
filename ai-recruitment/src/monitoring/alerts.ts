import { prisma } from "@/lib/db";
import { sendOpsAlert } from "@/lib/ops-alerts";
import { getLogger } from "@/monitoring/logger";
import { METRIC_KEYS, MetricsCollector } from "@/monitoring/metrics";

export interface AlertThreshold {
  metricKey: string;
  target: number;
  alertBelow?: number;
  alertAbove?: number;
  severity: "warning" | "critical";
  domain?: string;
}

export const ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    metricKey: METRIC_KEYS.FIELD_EXTRACTION_ACCURACY,
    target: 0.98,
    alertBelow: 0.95,
    severity: "critical",
  },
  {
    metricKey: METRIC_KEYS.PASS2_TRIGGER_RATE,
    target: 0.2,
    alertAbove: 0.4,
    severity: "warning",
  },
  {
    metricKey: METRIC_KEYS.OLLAMA_API_P95_LATENCY_MS,
    target: 4000,
    alertAbove: 6000,
    severity: "warning",
  },
  {
    metricKey: METRIC_KEYS.EMBEDDING_QUEUE_DEPTH,
    target: 50,
    alertAbove: 200,
    severity: "critical",
  },
  {
    metricKey: METRIC_KEYS.DEAD_LETTER_QUEUE_COUNT,
    target: 0,
    alertAbove: 0,
    severity: "critical",
  },
  {
    metricKey: METRIC_KEYS.CACHE_HIT_RATE,
    target: 0.3,
    alertBelow: 0.1,
    severity: "warning",
  },
  {
    metricKey: METRIC_KEYS.PYDANTIC_REJECTION_RATE,
    target: 0.005,
    alertAbove: 0.01,
    severity: "warning",
  },
];

const COOLDOWN_MS = 60 * 60 * 1000;

let appInsightsClient: { trackMetric: (opts: { name: string; value: number }) => void } | null =
  null;

async function getAppInsights() {
  if (appInsightsClient) return appInsightsClient;
  const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!conn) return null;
  try {
    const appInsights = await import("applicationinsights");
    if (!appInsights.defaultClient) {
      appInsights.setup(conn).start();
    }
    appInsightsClient = appInsights.defaultClient;
    return appInsightsClient;
  } catch {
    return null;
  }
}

function isBreached(threshold: AlertThreshold, value: number): boolean {
  if (threshold.alertBelow != null && value < threshold.alertBelow) return true;
  if (threshold.alertAbove != null && value > threshold.alertAbove) return true;
  return false;
}

async function canFireAlert(metricKey: string, domain?: string): Promise<boolean> {
  const key = domain ? `${metricKey}:${domain}` : metricKey;
  const row = await prisma.alertCooldown.findUnique({ where: { metricKey: key } });
  if (!row) return true;
  return Date.now() - row.lastFiredAt.getTime() >= COOLDOWN_MS;
}

async function markAlertFired(metricKey: string, domain?: string): Promise<void> {
  const key = domain ? `${metricKey}:${domain}` : metricKey;
  await prisma.alertCooldown.upsert({
    where: { metricKey: key },
    create: { metricKey: key, lastFiredAt: new Date() },
    update: { lastFiredAt: new Date() },
  });
}

export class AlertChecker {
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
      [METRIC_KEYS.EMBEDDING_QUEUE_DEPTH]: queueMetrics.embeddingQueueDepth,
      [METRIC_KEYS.DEAD_LETTER_QUEUE_COUNT]: queueMetrics.deadLetterQueueCount,
    };

    for (const threshold of ALERT_THRESHOLDS) {
      const rows = metrics.filter(
        (m) =>
          m.metricKey === threshold.metricKey &&
          (threshold.domain ? m.domain === threshold.domain : !m.dimensions)
      );

      const values =
        rows.length > 0
          ? rows.map((r) => ({ value: r.value, domain: r.domain ?? undefined }))
          : liveValues[threshold.metricKey] != null
            ? [{ value: liveValues[threshold.metricKey], domain: threshold.domain }]
            : [];

      for (const { value, domain } of values) {
        if (!isBreached(threshold, value)) continue;
        if (!(await canFireAlert(threshold.metricKey, domain))) continue;

        const label = domain
          ? `${threshold.metricKey} (${domain})`
          : threshold.metricKey;

        log.warn({
          alert: true,
          metricKey: threshold.metricKey,
          domain,
          value,
          target: threshold.target,
          alertBelow: threshold.alertBelow,
          alertAbove: threshold.alertAbove,
        });

        await sendOpsAlert({
          subject: `Metric alert: ${label}`,
          body: `Value ${value} breached threshold (target ${threshold.target}).`,
          severity: threshold.severity === "critical" ? "critical" : "warning",
        });

        const ai = await getAppInsights();
        ai?.trackMetric({ name: threshold.metricKey, value });

        await markAlertFired(threshold.metricKey, domain);
        fired.push(label);
      }
    }

    return { fired };
  }
}
