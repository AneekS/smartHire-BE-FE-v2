export type { CalibrationStatus } from "@/calibration/types/calibration.types";

export type RecruiterOutcome =
  | "HIRED"
  | "REJECTED"
  | "INTERVIEW_STAGE1"
  | "INTERVIEW_STAGE2"
  | "OFFER_EXTENDED"
  | "OFFER_DECLINED"
  | "WITHDRAWN";

export interface DecisionPayload {
  jobAtsScoreId: string;
  outcome: RecruiterOutcome;
  noteText?: string;
}

export interface RecruiterDashboard {
  openJobs: number;
  pendingDecisions: number;
  recentOutcomes: number;
  candidatePipeline: number;
}
