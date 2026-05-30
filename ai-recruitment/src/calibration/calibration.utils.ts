import { INDUSTRY_WEIGHTS } from "@/scoring/constants";
import type { WeightProfile } from "@/scoring/types";
import type { IndustryDomain } from "@/scoring/v3/types";
import type { IndustryProfile } from "@prisma/client";
import { SCORE_COMPONENTS } from "@/feedback/types";
import type { DerivedWeights } from "@/calibration/types/calibration.types";

export const MIN_HIRED = 20;
export const MIN_REJECTED = 20;
export const MIN_TOTAL_DECISIONS = 40;
export const MIN_DISCRIMINATION = 0.1;
export const DERIVED_BLEND = 0.7;
export const DEFAULT_BLEND = 0.3;

export type WeightCalibrationWeights = DerivedWeights & {
  semanticWeight: number;
  skillWeight: number;
  experienceWeight: number;
  complianceWeight: number;
  projectWeight: number;
  educationWeight: number;
  qualityWeight: number;
};

export const COMPONENT_TO_WEIGHT: Record<
  (typeof SCORE_COMPONENTS)[number],
  keyof Omit<
    WeightCalibrationWeights,
    "semantic" | "skill" | "experience" | "compliance" | "project" | "education" | "quality"
  >
> = {
  semanticMatch: "semanticWeight",
  skillMatch: "skillWeight",
  experienceMatch: "experienceWeight",
  atsCompliance: "complianceWeight",
  projectRelevance: "projectWeight",
  educationMatch: "educationWeight",
  resumeQuality: "qualityWeight",
};

export function extractComponentScore(
  breakdown: unknown,
  component: string
): number | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const b = breakdown as Record<string, unknown>;
  const entry = b[component];
  if (entry == null) return null;
  if (typeof entry === "number") return entry;
  if (typeof entry === "object" && entry !== null && "score" in entry) {
    const score = (entry as { score: unknown }).score;
    return typeof score === "number" ? score : null;
  }
  return null;
}

export function extractFinalScore(
  breakdown: unknown,
  fallback?: number | null
): number | null {
  if (typeof fallback === "number") return fallback;
  if (!breakdown || typeof breakdown !== "object") return null;
  const b = breakdown as Record<string, unknown>;
  if (typeof b.overallScore === "number") return b.overallScore;
  return null;
}

export function normalizeWeightRecord(
  weights: Omit<
    WeightCalibrationWeights,
    "semantic" | "skill" | "experience" | "compliance" | "project" | "education" | "quality"
  >
): Omit<
  WeightCalibrationWeights,
  "semantic" | "skill" | "experience" | "compliance" | "project" | "education" | "quality"
> {
  const sum =
    weights.semanticWeight +
    weights.skillWeight +
    weights.experienceWeight +
    weights.complianceWeight +
    weights.projectWeight +
    weights.educationWeight +
    weights.qualityWeight;
  if (sum <= 0) return weights;
  return {
    semanticWeight: weights.semanticWeight / sum,
    skillWeight: weights.skillWeight / sum,
    experienceWeight: weights.experienceWeight / sum,
    complianceWeight: weights.complianceWeight / sum,
    projectWeight: weights.projectWeight / sum,
    educationWeight: weights.educationWeight / sum,
    qualityWeight: weights.qualityWeight / sum,
  };
}

export function toWeightProfile(
  w: Omit<
    WeightCalibrationWeights,
    "semantic" | "skill" | "experience" | "compliance" | "project" | "education" | "quality"
  >
): WeightProfile {
  return {
    semanticMatch: w.semanticWeight,
    skillMatch: w.skillWeight,
    experienceMatch: w.experienceWeight,
    atsCompliance: w.complianceWeight,
    projectRelevance: w.projectWeight,
    educationMatch: w.educationWeight,
    resumeQuality: w.qualityWeight,
  };
}

export function fromWeightProfile(profile: WeightProfile): Omit<
  WeightCalibrationWeights,
  "semantic" | "skill" | "experience" | "compliance" | "project" | "education" | "quality"
> {
  return {
    semanticWeight: profile.semanticMatch,
    skillWeight: profile.skillMatch,
    experienceWeight: profile.experienceMatch,
    complianceWeight: profile.atsCompliance,
    projectWeight: profile.projectRelevance,
    educationWeight: profile.educationMatch,
    qualityWeight: profile.resumeQuality,
  };
}

export function industryDefaults(
  industry: IndustryProfile
): Omit<
  WeightCalibrationWeights,
  "semantic" | "skill" | "experience" | "compliance" | "project" | "education" | "quality"
> {
  const domain = industry as IndustryDomain;
  const d = INDUSTRY_WEIGHTS[domain] ?? INDUSTRY_WEIGHTS.GENERAL;
  return {
    semanticWeight: d.semanticMatch,
    skillWeight: d.skillMatch,
    experienceWeight: d.experienceMatch,
    complianceWeight: d.atsCompliance,
    projectWeight: d.projectRelevance,
    educationWeight: d.educationMatch,
    qualityWeight: d.resumeQuality,
  };
}

export function weightRowToProfile(row: {
  semanticWeight: number;
  skillWeight: number;
  experienceWeight: number;
  complianceWeight: number;
  projectWeight: number;
  educationWeight: number;
  qualityWeight: number;
}): WeightProfile {
  return toWeightProfile(row);
}
