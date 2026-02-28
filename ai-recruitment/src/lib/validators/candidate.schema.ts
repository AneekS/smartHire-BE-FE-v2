import { z } from "zod";

export const CandidateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  preferredRoles: z.array(z.string()).optional(),
  salaryExpectationMin: z.number().int().optional(),
  salaryExpectationMax: z.number().int().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "RECRUITERS_ONLY"]).optional(),
});
