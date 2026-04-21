import { z } from "zod";

export const SalaryProfileSchema = z
  .object({
    minSalary: z.coerce.number().int().min(0),
    maxSalary: z.coerce.number().int().min(0),
    currency: z.string().trim().min(3).max(5).default("INR"),
    salaryType: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),
    isNegotiable: z.boolean().default(true),
    preferredLocations: z.array(z.string().trim().min(1).max(80)).default([]),
    confidenceScore: z.coerce.number().min(0).max(1).optional(),
  })
  .refine((payload) => payload.minSalary <= payload.maxSalary, {
    message: "minSalary must be less than or equal to maxSalary",
    path: ["minSalary"],
  });
