import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/rate-limit";
import { ATS_SCORE_METRIC_KEY } from "@/scoring/constants";

const CACHE_TTL_SEC = 3600;
const LOOKBACK_MS = 180 * 24 * 60 * 60 * 1000;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx] ?? 0;
}

function computePercentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
    count: sorted.length,
  };
}

export interface IndustryStatsResult {
  industry: string | null;
  seniorityBand: string | null;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  count: number;
}

export class IndustryStatsService {
  static cacheKey(
    tenantId: string,
    industry?: string | null,
    seniorityBand?: string | null
  ): string {
    return `industry-stats:${tenantId}:${industry ?? "all"}:${seniorityBand ?? "all"}`;
  }

  static async getStats(
    tenantId: string,
    industryProfile?: string | null,
    seniorityBand?: string | null
  ): Promise<{ data: IndustryStatsResult; cached: boolean }> {
    const cacheKey = IndustryStatsService.cacheKey(
      tenantId,
      industryProfile,
      seniorityBand
    );

    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return { data: JSON.parse(cached) as IndustryStatsResult, cached: true };
      }
    }

    const since = new Date(Date.now() - LOOKBACK_MS);
    const rows = await prisma.dailyMetric.findMany({
      where: {
        tenantId,
        metricKey: ATS_SCORE_METRIC_KEY,
        date: { gte: since },
        ...(industryProfile ? { domain: industryProfile } : {}),
        ...(seniorityBand ? { dimension1: seniorityBand } : {}),
      },
      select: { value: true, metricValue: true },
    });

    const values = rows
      .map((r) => r.metricValue ?? r.value)
      .filter((v): v is number => typeof v === "number");

    const stats = computePercentiles(values);
    const payload: IndustryStatsResult = {
      industry: industryProfile ?? null,
      seniorityBand: seniorityBand ?? null,
      ...stats,
    };

    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(payload));
    }

    return { data: payload, cached: false };
  }
}
