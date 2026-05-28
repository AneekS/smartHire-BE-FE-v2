import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ScoreBreakdown, ScoreResult } from "@/models/scoring.schema";

export const SCORE_COMPONENTS_V3 = [
  "semanticMatch",
  "skillMatch",
  "experienceMatch",
  "atsCompliance",
  "projectRelevance",
  "educationMatch",
  "resumeQuality",
] as const;

export type ScoreComponentV3 = (typeof SCORE_COMPONENTS_V3)[number];

export type IndustryDomain =
  | "TECH"
  | "FINANCE"
  | "HEALTHCARE"
  | "SALES"
  | "CREATIVE"
  | "LEGAL"
  | "GENERAL";

export type ComponentScoresV3 = Record<ScoreComponentV3, number>;

export interface AtsScoreContext {
  resume: ResumeSchemaType;
  job: JobSchemaType;
  candidateId: string;
  tenantId?: string;
  parseConfidence?: number;
  currentYear?: number;
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
  pipeline: "ats-v3";
}

export interface ComponentDetail {
  score: number;
  reason: string;
  matched?: string[];
  missing?: string[];
  bonus?: string[];
}
