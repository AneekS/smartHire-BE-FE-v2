import { z } from "zod";

export const AtsGenerateSchema = z.object({
  resumeVersionId: z.string().min(1),
  jobId: z.string().min(1),
});

export const IndustryStatsQuerySchema = z.object({
  industry: z.string().optional(),
  seniorityBand: z.string().optional(),
});

export const RecruiterOutcomeSchema = z.object({
  jobAtsScoreId: z.string().min(1),
  outcome: z.enum([
    "HIRED",
    "REJECTED",
    "INTERVIEW_STAGE1",
    "INTERVIEW_STAGE2",
    "OFFER_EXTENDED",
    "OFFER_DECLINED",
    "WITHDRAWN",
  ]),
  noteText: z.string().optional(),
});

export const ResumeSearchQuerySchema = z.object({
  q: z.string().min(1),
  industry: z.string().optional(),
  seniority: z.string().optional(),
  topK: z.coerce.number().int().min(1).max(50).default(10),
});

export const JobCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requirements: z.string().min(1),
  location: z.string().min(1),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"]),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  experienceMin: z.number().int().optional(),
  experienceMax: z.number().int().optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  requiredSkills: z.array(z.string()).default([]),
  companyId: z.string().optional(),
});

export const JobPatchSchema = JobCreateSchema.partial();
