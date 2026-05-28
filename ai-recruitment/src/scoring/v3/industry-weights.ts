import type { IndustryDomain } from "@/scoring/v3/types";
import type { ScoreComponentV3 } from "@/scoring/v3/types";

export type IndustryWeightProfile = Record<ScoreComponentV3, number>;

/** Fractions sum to 1.0 per industry (ATS v3 spec). */
export const INDUSTRY_WEIGHT_PROFILES: Record<IndustryDomain, IndustryWeightProfile> = {
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

export function resolveIndustry(jdIndustry?: string, resumeIndustry?: string): IndustryDomain {
  const raw = (jdIndustry ?? resumeIndustry ?? "GENERAL").toUpperCase();
  if (raw in INDUSTRY_WEIGHT_PROFILES) return raw as IndustryDomain;
  if (raw === "CREATIVE") return "CREATIVE";
  return "GENERAL";
}

export function getIndustryWeights(industry: IndustryDomain): IndustryWeightProfile {
  return INDUSTRY_WEIGHT_PROFILES[industry] ?? INDUSTRY_WEIGHT_PROFILES.GENERAL;
}
