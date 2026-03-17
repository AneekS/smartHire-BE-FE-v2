import { z } from "zod";

export const ExperienceLevelSchema = z.enum(["ENTRY", "MID", "SENIOR", "LEAD"]);
export const WorkTypeSchema = z.enum(["REMOTE", "HYBRID", "ONSITE", "CONTRACT", "FREELANCE"]);
export const SalaryVisibilitySchema = z.enum(["PUBLIC", "RANGE_ONLY", "PRIVATE"]);

const stringArray = z.array(z.string().trim().min(1)).max(25).default([]);

const PreferenceBaseSchema = z.object({
  primaryRole: z.string().trim().min(2).max(120),
  secondaryRoles: stringArray,
  exploratoryRoles: stringArray,
  experienceLevel: ExperienceLevelSchema,
  preferredIndustries: stringArray,
  preferredWorkTypes: z.array(WorkTypeSchema).max(5).default([]),
  preferredLocations: stringArray,
  salaryMin: z.number().int().nonnegative(),
  salaryTarget: z.number().int().nonnegative(),
  salaryMax: z.number().int().nonnegative(),
  salaryVisibility: SalaryVisibilitySchema.default("RANGE_ONLY"),
});

function validateSalaryOrder(
  value: { salaryMin?: number; salaryTarget?: number; salaryMax?: number },
  ctx: z.RefinementCtx,
) {
  if (
    value.salaryMin !== undefined &&
    value.salaryTarget !== undefined &&
    value.salaryMin > value.salaryTarget
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salaryTarget"],
      message: "salaryTarget must be >= salaryMin",
    });
  }

  if (
    value.salaryTarget !== undefined &&
    value.salaryMax !== undefined &&
    value.salaryTarget > value.salaryMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salaryMax"],
      message: "salaryMax must be >= salaryTarget",
    });
  }
}

export const PreferenceBodySchema = PreferenceBaseSchema.superRefine((value, ctx) => {
  validateSalaryOrder(value, ctx);
});

export const PreferencePatchSchema = PreferenceBaseSchema.partial().superRefine((value, ctx) => {
  validateSalaryOrder(value, ctx);
});

export const SalaryInsightsQuerySchema = z.object({
  role: z.string().trim().min(2),
  location: z.string().trim().min(2),
  experience: ExperienceLevelSchema,
});

export const RoleFitQuerySchema = z.object({
  refresh: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(20).default(6),
  cursor: z.string().optional(),
});

export const RecruiterFilterSchema = z.object({
  preferredRole: z.string().trim().min(2).optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  experienceLevel: ExperienceLevelSchema.optional(),
  workType: WorkTypeSchema.optional(),
  industryPreference: z.string().trim().min(2).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
