import type { IndustryProfile, SeniorityBand } from "@prisma/client";

export type { IndustryProfile, SeniorityBand };

export interface IndustryPercentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface IndustryStatsCard {
  industryProfile: IndustryProfile;
  seniorityBand: SeniorityBand | null;
  percentiles: IndustryPercentiles;
  sampleSize: number;
  userScore: number | null;
  userPercentile: number | null;
  benchmarkLabel: string;
}

export type WeightProfileSource =
  | "recruiter_override"
  | "calibrated"
  | "industry_default"
  | "general_default";

export interface WeightProfileWeights {
  semantic: number;
  skill: number;
  experience: number;
  compliance: number;
  project: number;
  education: number;
  quality: number;
}

export interface WeightProfileDisplay {
  source: WeightProfileSource;
  industryProfile: IndustryProfile;
  weights: WeightProfileWeights;
  calibrationSampleSize?: number;
  lastCalibratedAt?: string | null;
  message: string;
}
