import { z } from "zod";

export const ApplicationApplySchema = z.object({
  job_id: z.string().min(1),
  cover_note: z.string().max(2000).optional(),
});

export const ApplicationStatusUpdateSchema = z.object({
  status: z.enum([
    "APPLIED",
    "RESUME_VIEWED",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "INTERVIEW_SCHEDULED",
    "INTERVIEW_COMPLETED",
    "OFFER",
    "REJECTED",
    "HIRED",
    "WITHDRAWN",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ApplicationNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const ApplicationListQuerySchema = z.object({
  status: z
    .enum([
      "APPLIED",
      "RESUME_VIEWED",
      "UNDER_REVIEW",
      "SHORTLISTED",
      "INTERVIEW_SCHEDULED",
      "INTERVIEW_COMPLETED",
      "OFFER",
      "REJECTED",
      "HIRED",
      "WITHDRAWN",
    ])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const RecruiterActivitySchema = z.object({
  application_id: z.string().min(1),
  activity_type: z.enum([
    "RESUME_VIEWED",
    "PROFILE_VIEWED",
    "SHORTLISTED",
    "INTERVIEW_SCHEDULED",
    "NOTE_ADDED",
    "ASSESSMENT_SENT",
    "OFFER_SENT",
    "REJECTED",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
