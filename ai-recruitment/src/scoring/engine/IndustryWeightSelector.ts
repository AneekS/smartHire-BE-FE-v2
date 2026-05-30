import {
  CALIBRATION_SAMPLE_MIN,
  getIndustryWeights,
  INDUSTRY_WEIGHTS,
  resolveIndustry,
} from "@/scoring/constants";
import type {
  IndustryDomain,
  WeightProfile,
  WeightSelectionResult,
} from "@/scoring/types";
import type { WeightCalibration } from "@prisma/client";
import { weightCalibrationToProfile } from "@/scoring/types";

export interface WeightSelectorInput {
  jobIndustry?: string;
  resumeIndustry?: string;
  recruiterOverride?: Partial<WeightProfile> | null;
  calibration?: WeightCalibration | null;
}

export function selectIndustryWeights(input: WeightSelectorInput): WeightSelectionResult {
  const industryProfile = resolveIndustry(input.jobIndustry, input.resumeIndustry);

  if (input.recruiterOverride && hasCompleteOverride(input.recruiterOverride)) {
    return {
      weights: normalizeWeights(mergeWithGeneral(input.recruiterOverride, industryProfile)),
      source: "recruiter_override",
      sampleSize: input.calibration?.sampleSize ?? 0,
      industryProfile,
    };
  }

  const cal = input.calibration;
  if (cal?.isActive && cal.sampleSize > CALIBRATION_SAMPLE_MIN) {
    return {
      weights: normalizeWeights(weightCalibrationToProfile(cal)),
      source: "calibrated",
      sampleSize: cal.sampleSize,
      industryProfile,
    };
  }

  if (industryProfile in INDUSTRY_WEIGHTS && industryProfile !== "GENERAL") {
    return {
      weights: getIndustryWeights(industryProfile),
      source: "industry",
      sampleSize: cal?.sampleSize ?? 0,
      industryProfile,
    };
  }

  return {
    weights: getIndustryWeights("GENERAL"),
    source: "general",
    sampleSize: cal?.sampleSize ?? 0,
    industryProfile: "GENERAL",
  };
}

function hasCompleteOverride(o: Partial<WeightProfile>): boolean {
  const keys = Object.keys(INDUSTRY_WEIGHTS.GENERAL) as (keyof WeightProfile)[];
  return keys.some((k) => o[k] != null && o[k]! > 0);
}

function mergeWithGeneral(
  override: Partial<WeightProfile>,
  industry: IndustryDomain
): WeightProfile {
  const base = getIndustryWeights(industry);
  return { ...base, ...override } as WeightProfile;
}

function normalizeWeights(weights: WeightProfile): WeightProfile {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum <= 0) return getIndustryWeights("GENERAL");
  const out = {} as WeightProfile;
  for (const key of Object.keys(weights) as (keyof WeightProfile)[]) {
    out[key] = weights[key] / sum;
  }
  return out;
}
