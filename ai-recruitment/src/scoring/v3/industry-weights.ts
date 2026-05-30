import type { IndustryDomain, WeightProfile } from "@/scoring/types";
import {
  INDUSTRY_WEIGHTS,
  getIndustryWeights as getWeights,
  resolveIndustry as resolveInd,
} from "@/scoring/constants";

export type IndustryWeightProfile = WeightProfile;

/** @deprecated Use INDUSTRY_WEIGHTS from @/scoring/constants */
export const INDUSTRY_WEIGHT_PROFILES: Record<IndustryDomain, IndustryWeightProfile> =
  INDUSTRY_WEIGHTS;

export const resolveIndustry = resolveInd;
export const getIndustryWeights = getWeights;
