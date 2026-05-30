import crypto from "crypto";
import { CONFIDENCE_REVIEW_THRESHOLD, computeIndustryCalibrationFactor } from "@/scoring/constants";
import { computeScoreConfidence as computeParseConfidence } from "@/scoring/engine/ConfidenceScorer";
import type { ComponentScores, FinalScoreResult, WeightProfile } from "@/scoring/types";
import type { ResumeSchemaType } from "@/models/resume.schema";

export function weightedComponentSum(
  components: ComponentScores,
  weights: WeightProfile
): number {
  let sum = 0;
  for (const key of Object.keys(components) as (keyof ComponentScores)[]) {
    sum += (components[key] ?? 0) * (weights[key] ?? 0);
  }
  return sum;
}

export function computeConfidenceMultiplier(
  parseConfidence: number | undefined,
  components: ComponentScores
): number {
  const values = Object.values(components);
  const avg = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / Math.max(values.length, 1);
  const spreadPenalty = Math.min(0.15, variance / 10000);
  const base = parseConfidence != null ? 0.5 + parseConfidence * 0.5 : 0.85;
  return Math.max(0.5, Math.min(1.1, base - spreadPenalty));
}

export function computeScoreHash(input: {
  resumeVersionId: string;
  jobId: string;
  weights: WeightProfile;
  componentScores: ComponentScores;
}): string {
  const payload = JSON.stringify({
    resumeVersionId: input.resumeVersionId,
    jobId: input.jobId,
    weights: input.weights,
    componentScores: input.componentScores,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function computeFinalScore(
  components: ComponentScores,
  weights: WeightProfile,
  options: {
    resumeVersionId: string;
    jobId: string;
    resume: ResumeSchemaType;
    parseConfidence?: number;
    calibrationSampleSize?: number;
    percentileRank?: number;
    applyDealbreakerCap?: boolean;
  }
): FinalScoreResult {
  const base = weightedComponentSum(components, weights);
  const confidenceMultiplier = computeConfidenceMultiplier(
    options.parseConfidence,
    components
  );
  const industryCalibrationFactor = computeIndustryCalibrationFactor(
    options.calibrationSampleSize ?? 0
  );

  const raw = base * confidenceMultiplier * industryCalibrationFactor;
  let overallScore = Math.max(0, Math.min(100, Math.round(raw)));
  if (options.applyDealbreakerCap) {
    overallScore = Math.min(30, overallScore);
  }

  const { scoreConfidence } = computeParseConfidence(options.resume, options.parseConfidence);

  const scoreHash = computeScoreHash({
    resumeVersionId: options.resumeVersionId,
    jobId: options.jobId,
    weights,
    componentScores: components,
  });

  return {
    overallScore,
    scoreConfidence,
    requiresManualReview: scoreConfidence < CONFIDENCE_REVIEW_THRESHOLD,
    confidenceMultiplier,
    industryCalibrationFactor,
    scoreHash,
    percentileRank: options.percentileRank,
  };
}

/** @deprecated Use computeFinalScore — kept for v3 tests */
export function computeFinalAts(
  components: ComponentScores,
  weights: WeightProfile,
  options: {
    parseConfidence?: number;
    industryCalibrationFactor?: number;
  }
) {
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
    requiresManualReview: scoreConfidence < CONFIDENCE_REVIEW_THRESHOLD,
    confidenceMultiplier,
  };
}
