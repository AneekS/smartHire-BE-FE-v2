import type { IndustryProfile } from "@prisma/client";
import type { WeightProfile } from "@/scoring/types";

export type { WeightProfile };

export type CalibrationResultStatus =
  | "INSUFFICIENT_DATA"
  | "NOT_MEANINGFUL"
  | "SUCCESS";

export interface DerivedWeights {
  semantic: number;
  skill: number;
  experience: number;
  compliance: number;
  project: number;
  education: number;
  quality: number;
}

export interface OutcomeAnalysisResult {
  status: CalibrationResultStatus;
  derivedWeights?: WeightProfile;
  discriminationPower?: number;
  sampleSize?: number;
  hired?: number;
  rejected?: number;
}

export interface CalibrationResult {
  status: CalibrationResultStatus;
  newWeights?: WeightProfile;
  previousWeights?: WeightProfile | null;
  sampleSize?: number;
  discriminationPower?: number;
  calibrationId?: string;
  calibrationVersion?: number;
  hired?: number;
  rejected?: number;
}

export interface CalibrationStatus {
  tenantId: string;
  industryProfile: IndustryProfile;
  currentSampleSize: number;
  requiredForCalibration: 40;
  isCalibrated: boolean;
  discriminationPower: number | null;
  lastCalibratedAt: string | null;
  nextCalibrationAt: string | null;
  calibrationVersion: number | null;
}

export interface PromptABVariantMetrics {
  variantId: string;
  variantName: string;
  sampleSize: number;
  avgConfidence: number;
  pass2Rate: number;
  pass3Rate: number;
  zodRejectionRate: number;
  isControl: boolean;
}

export interface PromptABResult {
  tenantId: string;
  variants: PromptABVariantMetrics[];
  winnerId: string | null;
  confidenceLift: number | null;
  promoted: boolean;
}

export interface SchedulerSummary {
  tenantsProcessed: number;
  calibrationsAttempted: number;
  calibrationsSucceeded: number;
  promptAnalyses: number;
}

export interface TenantCalibrationSummary {
  tenantId: string;
  industries: CalibrationResult[];
  promptAb: PromptABResult | null;
}
