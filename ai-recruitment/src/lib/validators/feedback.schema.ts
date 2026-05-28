import { z } from "zod";

export const RecruiterDecisionSchema = z.object({
  resume_id: z.string().min(1),
  job_id: z.string().min(1),
  job_source: z.enum(["LISTING", "LEGACY_JOB"]).optional(),
  tenant_id: z.string().optional(),
  decision: z.enum(["SHORTLISTED", "REJECTED", "HIRED", "PASSED_TO_INTERVIEW"]),
  decision_reason: z.string().optional(),
  ats_score_at_decision: z.number().optional(),
  score_breakdown: z.unknown().optional(),
  candidate_id: z.string().optional(),
  role_type: z.enum(["IC", "MANAGER", "EXECUTIVE", "SALES", "HEALTHCARE"]).optional(),
});

export const RecruiterCorrectionSchema = z.object({
  resume_id: z.string().min(1),
  field: z.string().min(1),
  original_value: z.string().min(1),
  corrected_value: z.string().min(1),
});
