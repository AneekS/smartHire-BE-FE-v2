import type { RecruiterDecisionType, DecisionSignalType, JobSource } from "@prisma/client";

export const GLOBAL_TENANT_ID = "__global__";

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

export const INDUSTRY_DOMAINS = [
  "TECH",
  "FINANCE",
  "HEALTHCARE",
  "SALES",
  "CREATIVE",
  "LEGAL",
  "GENERAL",
] as const;

export type IndustryDomainType = (typeof INDUSTRY_DOMAINS)[number];

/** @deprecated Use industryDomain — kept for DB column compatibility */
export const ROLE_TYPES = ["IC", "MANAGER", "EXECUTIVE", "SALES", "HEALTHCARE"] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export const DECISION_SIGNAL: Record<
  RecruiterDecisionType,
  { signalType: DecisionSignalType; signalStrength: number }
> = {
  HIRED: { signalType: "POSITIVE", signalStrength: 1.0 },
  SHORTLISTED: { signalType: "POSITIVE", signalStrength: 0.8 },
  PASSED_TO_INTERVIEW: { signalType: "NEUTRAL", signalStrength: 0.6 },
  REJECTED: { signalType: "NEGATIVE", signalStrength: -1.0 },
};

export type FractionWeightProfile = Record<ScoreComponent, number>;

export interface RecordDecisionInput {
  resumeId: string;
  jobId: string;
  jobSource?: JobSource;
  tenantId?: string;
  decision: RecruiterDecisionType;
  decisionReason?: string;
  atsScoreAtDecision?: number;
  scoreBreakdown?: unknown;
  recruiterId: string;
  candidateId?: string;
  industryDomain?: string;
  /** @deprecated */
  roleType?: string;
}

export interface RecordCorrectionInput {
  resumeId: string;
  field: string;
  originalValue: string;
  correctedValue: string;
  recruiterId: string;
}
