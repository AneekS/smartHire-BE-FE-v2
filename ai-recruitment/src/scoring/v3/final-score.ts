import type { ScoreBreakdown } from "@/models/scoring.schema";
import type { IndustryWeightProfile } from "@/scoring/v3/industry-weights";
import type { ComponentScoresV3 } from "@/scoring/v3/types";

export function weightedComponentSum(
  components: ComponentScoresV3,
  weights: IndustryWeightProfile
): number {
  let sum = 0;
  for (const key of Object.keys(components) as (keyof ComponentScoresV3)[]) {
    sum += (components[key] ?? 0) * (weights[key] ?? 0);
  }
  return sum;
}

export function computeConfidenceMultiplier(
  parseConfidence: number | undefined,
  components: ComponentScoresV3
): number {
  const values = Object.values(components);
  const avg = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / Math.max(values.length, 1);
  const spreadPenalty = Math.min(0.15, variance / 10000);
  const base = parseConfidence != null ? 0.5 + parseConfidence * 0.5 : 0.85;
  return Math.max(0.5, Math.min(1.1, base - spreadPenalty));
}

export function computeFinalAts(
  components: ComponentScoresV3,
  weights: IndustryWeightProfile,
  options: {
    parseConfidence?: number;
    industryCalibrationFactor?: number;
  }
): {
  overallScore: number;
  scoreConfidence: number;
  requiresManualReview: boolean;
  confidenceMultiplier: number;
} {
  const base = weightedComponentSum(components, weights);
  const confidenceMultiplier = computeConfidenceMultiplier(
    options.parseConfidence,
    components
  );
  const calibration = options.industryCalibrationFactor ?? 1;
  const raw = base * confidenceMultiplier * calibration;
  const overallScore = Math.max(0, Math.min(100, Math.round(raw)));

  const scoreConfidence =
    options.parseConfidence != null
      ? Math.max(0, Math.min(1, options.parseConfidence))
      : confidenceMultiplier;

  return {
    overallScore,
    scoreConfidence,
    requiresManualReview: scoreConfidence < 0.6,
    confidenceMultiplier,
  };
}
