import { ATS_SCORE_METRIC_KEY } from "@/scoring/constants";

/** Percentile rank of score against historical DailyMetric samples (0–100). */
export function computePercentileRank(
  score: number,
  historicalScores: number[]
): number | undefined {
  if (!historicalScores.length) return undefined;
  const below = historicalScores.filter((s) => s < score).length;
  return Math.round((below / historicalScores.length) * 100);
}

export function extractHistoricalScores(
  metrics: Array<{ metricKey: string; value: number; domain?: string | null }>,
  industryDomain?: string
): number[] {
  return metrics
    .filter(
      (m) =>
        m.metricKey === ATS_SCORE_METRIC_KEY &&
        (!industryDomain || m.domain === industryDomain)
    )
    .map((m) => m.value);
}

export class ScoreNormalizer {
  static percentileFromHistory(
    score: number,
    historicalScores: number[]
  ): number | undefined {
    return computePercentileRank(score, historicalScores);
  }
}
