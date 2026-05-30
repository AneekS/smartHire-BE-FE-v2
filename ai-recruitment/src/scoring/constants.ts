import type { IndustryDomain, WeightProfile } from "@/scoring/types";

export const CONFIDENCE_REVIEW_THRESHOLD = 0.6;
export const RECENCY_HALF_LIFE_YEARS = 3;
export const CALIBRATION_SAMPLE_MIN = 50;
export const CALIBRATION_BLEND_BASE = 0.3;
export const CALIBRATION_BLEND_CALIBRATED = 0.7;
export const INDUSTRY_CALIBRATION_BASE = 0.85;
export const INDUSTRY_CALIBRATION_SCALE = 0.15;
export const INDUSTRY_CALIBRATION_SAMPLE_CAP = 1000;
export const ATS_SCORE_METRIC_KEY = "ats_final_score";
export const EMBEDDING_DIMENSIONS = 4096;

export const SENIORITY_BANDS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;
export type SeniorityBandLabel = (typeof SENIORITY_BANDS)[number];

export const SENIORITY_LABELS: Record<SeniorityBandLabel, string> = {
  L1: "Intern",
  L2: "Junior",
  L3: "Mid",
  L4: "Senior",
  L5: "Staff/Lead",
  L6: "Principal/Director+",
};

/** Fractions sum to 1.0 per industry (ATS spec). */
export const INDUSTRY_WEIGHTS: Record<IndustryDomain, WeightProfile> = {
  TECH: {
    semanticMatch: 0.32,
    skillMatch: 0.28,
    experienceMatch: 0.14,
    projectRelevance: 0.12,
    atsCompliance: 0.08,
    educationMatch: 0.04,
    resumeQuality: 0.02,
  },
  FINANCE: {
    semanticMatch: 0.25,
    skillMatch: 0.22,
    experienceMatch: 0.2,
    atsCompliance: 0.15,
    educationMatch: 0.1,
    projectRelevance: 0.05,
    resumeQuality: 0.03,
  },
  HEALTHCARE: {
    semanticMatch: 0.25,
    skillMatch: 0.2,
    experienceMatch: 0.18,
    educationMatch: 0.18,
    atsCompliance: 0.12,
    projectRelevance: 0.05,
    resumeQuality: 0.02,
  },
  SALES: {
    semanticMatch: 0.28,
    skillMatch: 0.22,
    experienceMatch: 0.22,
    resumeQuality: 0.12,
    atsCompliance: 0.1,
    projectRelevance: 0.04,
    educationMatch: 0.02,
  },
  CREATIVE: {
    semanticMatch: 0.3,
    skillMatch: 0.2,
    projectRelevance: 0.2,
    resumeQuality: 0.15,
    experienceMatch: 0.1,
    atsCompliance: 0.03,
    educationMatch: 0.02,
  },
  LEGAL: {
    semanticMatch: 0.28,
    skillMatch: 0.2,
    educationMatch: 0.18,
    experienceMatch: 0.18,
    atsCompliance: 0.12,
    resumeQuality: 0.03,
    projectRelevance: 0.01,
  },
  GENERAL: {
    semanticMatch: 0.3,
    skillMatch: 0.25,
    experienceMatch: 0.15,
    atsCompliance: 0.1,
    projectRelevance: 0.1,
    educationMatch: 0.05,
    resumeQuality: 0.05,
  },
};

export const SEMANTIC_SECTION_WEIGHTS: Record<string, number> = {
  EXPERIENCE_RECENT: 1.0,
  SKILLS: 0.85,
  ACHIEVEMENTS: 0.75,
  SUMMARY: 0.6,
  FULL_TEXT: 0.5,
  EDUCATION: 0.4,
  EXPERIENCE_ALL: 0.35,
};

export function resolveIndustry(jdIndustry?: string, resumeIndustry?: string): IndustryDomain {
  const raw = (jdIndustry ?? resumeIndustry ?? "GENERAL").toUpperCase();
  if (raw in INDUSTRY_WEIGHTS) return raw as IndustryDomain;
  return "GENERAL";
}

export function getIndustryWeights(industry: IndustryDomain): WeightProfile {
  return INDUSTRY_WEIGHTS[industry] ?? INDUSTRY_WEIGHTS.GENERAL;
}

export function computeIndustryCalibrationFactor(sampleSize: number): number {
  const factor =
    INDUSTRY_CALIBRATION_BASE +
    INDUSTRY_CALIBRATION_SCALE * (sampleSize / INDUSTRY_CALIBRATION_SAMPLE_CAP);
  return Math.min(1, factor);
}
