import {
  CALIBRATION_BLEND_BASE,
  CALIBRATION_BLEND_CALIBRATED,
  CALIBRATION_SAMPLE_MIN,
  getIndustryWeights,
} from "@/scoring/constants";
import type { IndustryDomain, WeightProfile } from "@/scoring/types";
import { weightCalibrationToProfile } from "@/scoring/types";
import type { WeightCalibration } from "@prisma/client";

export function adjustWeightsWithFeedback(
  baseWeights: WeightProfile,
  industry: IndustryDomain,
  calibration: WeightCalibration | null | undefined
): WeightProfile {
  if (!calibration || calibration.sampleSize < CALIBRATION_SAMPLE_MIN) {
    return baseWeights;
  }

  const calibrated = weightCalibrationToProfile(calibration);
  const industryDefaults = getIndustryWeights(industry);
  const blended = {} as WeightProfile;

  for (const key of Object.keys(baseWeights) as (keyof WeightProfile)[]) {
    const base = baseWeights[key];
    const cal = calibrated[key] ?? industryDefaults[key];
    blended[key] =
      base * CALIBRATION_BLEND_BASE + cal * CALIBRATION_BLEND_CALIBRATED;
  }

  const sum = Object.values(blended).reduce((a, b) => a + b, 0);
  if (sum <= 0) return baseWeights;
  for (const key of Object.keys(blended) as (keyof WeightProfile)[]) {
    blended[key] = blended[key] / sum;
  }
  return blended;
}
