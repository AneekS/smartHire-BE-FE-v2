import { prisma } from "@/lib/db";
import { EMBED_QUEUE_NAMES, RedisJobQueue } from "@/queue/redis-queue";
import type { IndustryProfile, Prisma } from "@prisma/client";

export const METRIC_KEYS = {
  FIELD_EXTRACTION_ACCURACY: "field_extraction_accuracy",
  PASS2_TRIGGER_RATE: "pass2_trigger_rate",
  PASS3_CORRECTION_RATE: "pass3_correction_rate",
  OLLAMA_API_P95_LATENCY_MS: "ollama_api_p95_latency_ms",
  EMBEDDING_QUEUE_DEPTH: "embedding_queue_depth",
  DEAD_LETTER_QUEUE_COUNT: "dead_letter_queue_count",
  CACHE_HIT_RATE: "cache_hit_rate",
  PYDANTIC_REJECTION_RATE: "pydantic_rejection_rate",
  AVERAGE_PARSE_CONFIDENCE: "average_parse_confidence",
  /** Phase 6 spec aliases */
  OLLAMA_P95_LATENCY: "ollama_p95_latency",
  ZOD_REJECTION_RATE: "zod_rejection_rate",
  QUEUE_DEPTH: "queue_depth",
  DLQ_COUNT: "dlq_count",
  PARSE_ERROR_RATE: "parse_error_rate",
} as const;

type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];

/** Mirror legacy keys to spec alias keys on upsert. */
const METRIC_KEY_ALIASES: Partial<Record<MetricKey, MetricKey>> = {
  [METRIC_KEYS.OLLAMA_API_P95_LATENCY_MS]: METRIC_KEYS.OLLAMA_P95_LATENCY,
  [METRIC_KEYS.PYDANTIC_REJECTION_RATE]: METRIC_KEYS.ZOD_REJECTION_RATE,
  [METRIC_KEYS.EMBEDDING_QUEUE_DEPTH]: METRIC_KEYS.QUEUE_DEPTH,
  [METRIC_KEYS.DEAD_LETTER_QUEUE_COUNT]: METRIC_KEYS.DLQ_COUNT,
};

interface DayCounters {
  extractionsStarted: number;
  pass2Triggered: number;
  pass3Runs: number;
  pass3Corrected: number;
  dedupHits: number;
  dedupMisses: number;
  pydanticErrors: number;
  passAttempts: number;
  latencies: number[];
  confidences: number[];
}

const dayCounters: DayCounters = {
  extractionsStarted: 0,
  pass2Triggered: 0,
  pass3Runs: 0,
  pass3Corrected: 0,
  dedupHits: 0,
  dedupMisses: 0,
  pydanticErrors: 0,
  passAttempts: 0,
  latencies: [],
  confidences: [],
};

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export class MetricsCollector {
  static record(event: string, data?: Record<string, unknown>): void {
    switch (event) {
      case "extraction_started":
        dayCounters.extractionsStarted++;
        break;
      case "pass2_triggered":
        dayCounters.pass2Triggered++;
        break;
      case "pass3_complete":
        dayCounters.pass3Runs++;
        if (data?.pass3_corrected === true) dayCounters.pass3Corrected++;
        if (typeof data?.duration_ms === "number") dayCounters.latencies.push(data.duration_ms);
        if (typeof data?.confidence === "number") dayCounters.confidences.push(data.confidence);
        break;
      case "pass1_complete":
        dayCounters.passAttempts++;
        if (typeof data?.duration_ms === "number") dayCounters.latencies.push(data.duration_ms);
        break;
      case "dedup_hit":
        dayCounters.dedupHits++;
        break;
      case "dedup_miss":
        dayCounters.dedupMisses++;
        break;
      case "pydantic_error":
        dayCounters.pydanticErrors++;
        dayCounters.passAttempts++;
        break;
      default:
        break;
    }
  }

  static async getQueueMetrics(): Promise<{
    embeddingQueueDepth: number;
    deadLetterQueueCount: number;
  }> {
    const queueNames = [
      EMBED_QUEUE_NAMES.HIGH,
      EMBED_QUEUE_NAMES.NORMAL,
      EMBED_QUEUE_NAMES.RETRY,
      EMBED_QUEUE_NAMES.PARSE,
    ];

    let waiting = 0;
    let failed = 0;

    for (const name of queueNames) {
      const queue = RedisJobQueue.getEmbedQueue(name);
      if (!queue) continue;
      try {
        const counts = await queue.getJobCounts("waiting", "delayed", "failed");
        waiting += (counts.waiting ?? 0) + (counts.delayed ?? 0);
        failed += counts.failed ?? 0;
      } catch {
        // queue unavailable
      }
    }

    return { embeddingQueueDepth: waiting, deadLetterQueueCount: failed };
  }

  static async sampleQueueDepth(): Promise<number> {
    const { embeddingQueueDepth } = await this.getQueueMetrics();
    const now = new Date();

    await prisma.dailyMetric.create({
      data: {
        date: startOfDay(now),
        metricKey: METRIC_KEYS.EMBEDDING_QUEUE_DEPTH,
        value: embeddingQueueDepth,
        dimensions: { sample: true, sampledAt: now.toISOString() },
      },
    });

    return embeddingQueueDepth;
  }

  static async upsertMetric(
    date: Date,
    metricKey: MetricKey,
    value: number,
    domain?: string | null,
    dimensions?: Record<string, unknown>
  ): Promise<void> {
    const day = startOfDay(date);
    const existing = await prisma.dailyMetric.findFirst({
      where: { date: day, metricKey, domain: domain ?? null },
    });

    if (existing) {
      await prisma.dailyMetric.update({
        where: { id: existing.id },
        data: { value, dimensions: dimensions ? (dimensions as object) : undefined },
      });
    } else {
      await prisma.dailyMetric.create({
        data: {
          date: day,
          metricKey,
          metricName: metricKey,
          value,
          domain: domain ?? undefined,
          dimensions: dimensions ? (dimensions as object) : undefined,
        },
      });
    }

    const alias = METRIC_KEY_ALIASES[metricKey];
    if (alias && alias !== metricKey) {
      await this.upsertMetric(date, alias, value, domain, dimensions);
    }
  }

  /** Tenant-scoped metric upsert per @@unique([tenantId, date, metricName, dimension1]). */
  static async upsertTenantMetric(input: {
    tenantId: string;
    date: Date;
    metricName: string;
    dimension1?: string | null;
    value: number;
  }): Promise<void> {
    const day = startOfDay(input.date);
    const existing = await prisma.dailyMetric.findFirst({
      where: {
        tenantId: input.tenantId,
        date: day,
        metricName: input.metricName,
        dimension1: input.dimension1 ?? null,
      },
    });

    if (existing) {
      await prisma.dailyMetric.update({
        where: { id: existing.id },
        data: { value: input.value, metricValue: input.value },
      });
    } else {
      await prisma.dailyMetric.create({
        data: {
          tenantId: input.tenantId,
          date: day,
          metricKey: input.metricName,
          metricName: input.metricName,
          dimension1: input.dimension1 ?? undefined,
          value: input.value,
          metricValue: input.value,
        },
      });
    }
  }

  /** Daily ATS score average from all ApplicationAtsScore rows for tenant + industry (UTC day). */
  static async upsertAtsScoreDailyMetric(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      dayStart: Date;
      industryProfile: IndustryProfile;
      metricKey: string;
    }
  ): Promise<void> {
    const dayEnd = new Date(input.dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const agg = await tx.applicationAtsScore.aggregate({
      where: {
        tenantId: input.tenantId,
        industryProfile: input.industryProfile,
        computedAt: { gte: input.dayStart, lt: dayEnd },
      },
      _avg: { finalScore: true },
      _count: true,
    });

    const avgScore = agg._avg.finalScore ?? 0;
    const domain = input.industryProfile;

    const existing = await tx.dailyMetric.findFirst({
      where: {
        tenantId: input.tenantId,
        date: input.dayStart,
        metricKey: input.metricKey,
        domain,
      },
    });

    if (existing) {
      await tx.dailyMetric.update({
        where: { id: existing.id },
        data: { value: avgScore, metricValue: avgScore },
      });
    } else {
      await tx.dailyMetric.create({
        data: {
          tenantId: input.tenantId,
          date: input.dayStart,
          metricKey: input.metricKey,
          metricName: input.metricKey,
          value: avgScore,
          metricValue: avgScore,
          domain,
        },
      });
    }
  }

  static async computeDaily(date: Date = new Date()): Promise<void> {
    const day = startOfDay(date);
    const nextDay = new Date(day);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const events = await prisma.extractionEvent.findMany({
      where: { createdAt: { gte: day, lt: nextDay } },
    });

    const started = events.filter((e) => e.event === "extraction_started").length;
    const pass2 = events.filter((e) => e.event === "pass2_triggered").length;
    const pass3 = events.filter((e) => e.event === "pass3_complete");
    const pass3Corrected = pass3.filter(
      (e) => (e.metadata as { pass3_corrected?: boolean } | null)?.pass3_corrected === true
    ).length;
    const dedupHits = events.filter((e) => e.event === "dedup_hit").length;
    const dedupMisses = events.filter((e) => e.event === "dedup_miss").length;
    const pydanticErrors = events.filter((e) => e.event === "pydantic_error").length;
    const parseErrors = events.filter(
      (e) =>
        e.event === "pydantic_error" ||
        e.event === "validation_failed" ||
        e.event === "ollama_timeout"
    ).length;
    const passEvents = events.filter(
      (e) =>
        e.event === "pass1_complete" ||
        e.event === "pass2_triggered" ||
        e.event === "pass3_complete"
    );

    const latencies = passEvents
      .map((e) => e.durationMs)
      .filter((v): v is number => typeof v === "number");
    const confidences = pass3
      .map((e) => e.confidence)
      .filter((v): v is number => typeof v === "number");

    const totalDedup = dedupHits + dedupMisses;
    const passAttempts = events.filter(
      (e) =>
        e.event === "pass1_complete" ||
        e.event === "pass2_triggered" ||
        e.event === "pydantic_error"
    ).length;

    if (started > 0) {
      await this.upsertMetric(day, METRIC_KEYS.PASS2_TRIGGER_RATE, pass2 / started);
      await this.upsertMetric(day, METRIC_KEYS.PARSE_ERROR_RATE, parseErrors / started);
    }
    if (pass3.length > 0) {
      await this.upsertMetric(day, METRIC_KEYS.PASS3_CORRECTION_RATE, pass3Corrected / pass3.length);
    }
    if (latencies.length > 0) {
      await this.upsertMetric(day, METRIC_KEYS.OLLAMA_API_P95_LATENCY_MS, p95(latencies));
    }
    if (totalDedup > 0) {
      await this.upsertMetric(day, METRIC_KEYS.CACHE_HIT_RATE, dedupHits / totalDedup);
    }
    if (passAttempts > 0) {
      await this.upsertMetric(day, METRIC_KEYS.PYDANTIC_REJECTION_RATE, pydanticErrors / passAttempts);
    }
    if (confidences.length > 0) {
      const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      await this.upsertMetric(day, METRIC_KEYS.AVERAGE_PARSE_CONFIDENCE, avg);
    }

    const { embeddingQueueDepth, deadLetterQueueCount } = await this.getQueueMetrics();
    await this.upsertMetric(day, METRIC_KEYS.EMBEDDING_QUEUE_DEPTH, embeddingQueueDepth);
    await this.upsertMetric(day, METRIC_KEYS.DEAD_LETTER_QUEUE_COUNT, deadLetterQueueCount);

    // In-memory counters fallback for same-day partial data
    if (dayCounters.extractionsStarted > 0 && started === 0) {
      await this.upsertMetric(
        day,
        METRIC_KEYS.PASS2_TRIGGER_RATE,
        dayCounters.pass2Triggered / dayCounters.extractionsStarted
      );
    }
  }

  static async recordFieldAccuracy(
    date: Date,
    domain: string,
    accuracy: number
  ): Promise<void> {
    await this.upsertMetric(startOfDay(date), METRIC_KEYS.FIELD_EXTRACTION_ACCURACY, accuracy, domain);
  }

  static async getDashboardData(days = 7): Promise<DashboardPayload> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const metrics = await prisma.dailyMetric.findMany({
      where: { date: { gte: since }, NOT: { dimensions: { path: ["sample"], equals: true } } },
      orderBy: { date: "asc" },
    });

    const samples = await prisma.dailyMetric.findMany({
      where: {
        date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        metricKey: METRIC_KEYS.EMBEDDING_QUEUE_DEPTH,
        dimensions: { path: ["sample"], equals: true },
      },
      orderBy: { createdAt: "asc" },
    });

    const recentParsed = await prisma.parsedResume.findMany({
      where: { createdAt: { gte: since } },
      select: { extractionSchema: true, passesRun: true, pass3Changed: true },
      take: 500,
      orderBy: { createdAt: "desc" },
    });

    const domains = ["TECH", "FINANCE", "HEALTHCARE"] as const;
    const dates = [...new Set(metrics.map((m) => m.date.toISOString().slice(0, 10)))].sort();

    const accuracyByDomain = domains.map((domain) => ({
      domain,
      values: dates.map((d) => {
        const row = metrics.find(
          (m) =>
            m.metricKey === METRIC_KEYS.FIELD_EXTRACTION_ACCURACY &&
            m.domain === domain &&
            m.date.toISOString().slice(0, 10) === d
        );
        return row?.value ?? null;
      }),
    }));

    let pass1Only = 0;
    let pass2Triggered = 0;
    let pass3Corrected = 0;
    for (const row of recentParsed) {
      const runs = row.passesRun ?? [];
      if (runs.length <= 1) pass1Only++;
      else if (runs.includes(2) && !row.pass3Changed) pass2Triggered++;
      else if (row.pass3Changed) pass3Corrected++;
      else if (runs.includes(2)) pass2Triggered++;
      else pass1Only++;
    }

    const lowConfidenceFields: Record<string, number> = {};
    for (const row of recentParsed) {
      const schema = row.extractionSchema as { field_confidence?: Record<string, number> } | null;
      const fc = schema?.field_confidence ?? {};
      for (const [field, conf] of Object.entries(fc)) {
        if (conf < 0.7) {
          lowConfidenceFields[field] = (lowConfidenceFields[field] ?? 0) + 1;
        }
      }
    }

    const topLowConfidenceFields = Object.entries(lowConfidenceFields)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => ({ field, count }));

    const { embeddingQueueDepth } = await this.getQueueMetrics();

    return {
      dates,
      accuracyByDomain,
      passDistribution: { pass1Only, pass2Triggered, pass3Corrected },
      topLowConfidenceFields,
      parseConfidenceTrend: dates.map((d) => {
        const row = metrics.find(
          (m) =>
            m.metricKey === METRIC_KEYS.AVERAGE_PARSE_CONFIDENCE &&
            m.date.toISOString().slice(0, 10) === d
        );
        return row?.value ?? null;
      }),
      pydanticRejectionTrend: dates.map((d) => {
        const row = metrics.find(
          (m) =>
            m.metricKey === METRIC_KEYS.PYDANTIC_REJECTION_RATE &&
            m.date.toISOString().slice(0, 10) === d
        );
        return row?.value ?? null;
      }),
      queueDepthCurrent: embeddingQueueDepth,
      queueDepthTrend: samples.map((s) => ({
        at: (s.dimensions as { sampledAt?: string })?.sampledAt ?? s.createdAt.toISOString(),
        value: s.value,
      })),
    };
  }
}

export interface DashboardPayload {
  dates: string[];
  accuracyByDomain: Array<{ domain: string; values: (number | null)[] }>;
  passDistribution: { pass1Only: number; pass2Triggered: number; pass3Corrected: number };
  topLowConfidenceFields: Array<{ field: string; count: number }>;
  parseConfidenceTrend: (number | null)[];
  pydanticRejectionTrend: (number | null)[];
  queueDepthCurrent: number;
  queueDepthTrend: Array<{ at: string; value: number }>;
}
