import { z } from "zod";

export const JobApplySchema = z.object({
  job_id: z.string().uuid(),
  cover_note: z.string().optional(),
});

export const JobSearchSchema = z.object({
  role: z.string().optional(),
  location: z.string().optional(),
  skills: z.string().optional(),
  experience: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
