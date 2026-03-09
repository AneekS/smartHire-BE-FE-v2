import { z } from "zod";

export const JobApplySchema = z.object({
  job_id: z.string().min(1),
  cover_note: z.string().optional(),
});

export const JobSearchSchema = z.object({
  role: z.string().optional(),
  skills: z.string().optional(),
  location: z.string().optional(),
  experience: z.string().optional(),
  salary: z.string().optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  jobType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const SaveJobSchema = z.object({
  jobId: z.string().min(1),
});

export const JobAlertSchema = z.object({
  role: z.string().min(1),
  location: z.string().optional(),
});
