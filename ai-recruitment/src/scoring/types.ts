import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ScoreBreakdown, ScoreResult } from "@/models/scoring.schema";
import type { IndustryProfile, SeniorityBand, WeightCalibration } from "@prisma/client";

export const SCORE_COMPONENTS = [
  "semanticMatch",
  "skillMatch",
  "experienceMatch",
  "atsCompliance",
  "projectRelevance",
  "educationMatch",
  "resumeQuality",
] as const;

export type ScoreComponent = (typeof SCORE_COMPONENTS)[number];

export type ComponentScores = Record<ScoreComponent, number>;

export type WeightProfile = Record<ScoreComponent, number>;

export type IndustryDomain =
  | "TECH"
  | "FINANCE"
  | "HEALTHCARE"
  | "SALES"
  | "CREATIVE"
  | "LEGAL"
  | "GENERAL";

export type ComponentScoresV3 = ComponentScores;
export type ScoreComponentV3 = ScoreComponent;

export const SCORE_COMPONENTS_V3 = SCORE_COMPONENTS;

export interface ScoringContext {
  resume: ResumeSchemaType;
  job: JobSchemaType;
  candidateId: string;
  tenantId: string;
  resumeVersionId: string;
  parseConfidence?: number;
  currentYear?: number;
  resumeVectors?: Array<{ section: string; vector: number[] }>;
}

export interface AtsScoreContext {
  resume: ResumeSchemaType;
  job: JobSchemaType;
  candidateId: string;
  tenantId?: string;
  parseConfidence?: number;
  currentYear?: number;
}

export interface ComponentDetail {
  score: number;
  reason: string;
  /** False when skill match used a neutral fallback (e.g. empty JD required skills). */
  skillScoreReliable?: boolean;
  matched?: string[];
  missing?: string[];
  bonus?: string[];
}

export interface ScorerResults {
  components: ComponentScores;
  details: Record<string, ComponentDetail>;
}

export interface WeightSelectionResult {
  weights: WeightProfile;
  source: "recruiter_override" | "calibrated" | "industry" | "general";
  sampleSize: number;
  industryProfile: IndustryDomain;
}

export interface GeneralScoreResult {
  overallScore: number;
  scoreConfidence: number;
  requiresManualReview: boolean;
  scoreBreakdown: ScoreBreakdown;
  flags: string[];
  pipeline: "ats-v3-general";
}

export interface JobScoreResult extends ScoreResult {
  scoreConfidence: number;
  requiresManualReview: boolean;
  industryDomain: IndustryDomain;
  generalScore?: number;
  pipeline: "ats-v3" | "ats-v3-ephemeral";
  skillScoreReliable?: boolean;
  percentileRank?: number;
  dealbreakerCapApplied?: boolean;
}

export interface FinalScoreResult {
  overallScore: number;
  scoreConfidence: number;
  requiresManualReview: boolean;
  confidenceMultiplier: number;
  industryCalibrationFactor: number;
  scoreHash: string;
  percentileRank?: number;
}

export interface ComputeResult {
  applicationAtsScoreId: string;
  finalScore: number;
  components: ComponentScores;
  scoreHash: string;
  requiresManualReview: boolean;
  industryProfile: IndustryProfile;
  seniorityBand: SeniorityBand | null;
}

export function weightCalibrationToProfile(row: WeightCalibration): WeightProfile {
  return {
    semanticMatch: row.semanticWeight,
    skillMatch: row.skillWeight,
    experienceMatch: row.experienceWeight,
    atsCompliance: row.complianceWeight,
    projectRelevance: row.projectWeight,
    educationMatch: row.educationWeight,
    resumeQuality: row.qualityWeight,
  };
}

export function mapSeniorityToPrisma(band: string | null | undefined): SeniorityBand | null {
  const map: Record<string, SeniorityBand> = {
    L1: "L1_INTERN",
    L2: "L2_JUNIOR",
    L3: "L3_MID",
    L4: "L4_SENIOR",
    L5: "L5_STAFF",
    L6: "L6_PRINCIPAL",
    L1_INTERN: "L1_INTERN",
    L2_JUNIOR: "L2_JUNIOR",
    L3_MID: "L3_MID",
    L4_SENIOR: "L4_SENIOR",
    L5_STAFF: "L5_STAFF",
    L6_PRINCIPAL: "L6_PRINCIPAL",
  };
  if (!band) return null;
  return map[band] ?? null;
}

export function mapIndustryToProfile(domain: IndustryDomain): IndustryProfile {
  return domain as IndustryProfile;
}

export type { ScoreBreakdown, ScoreResult, JobSchemaType, ResumeSchemaType };
