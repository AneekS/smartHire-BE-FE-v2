import { z } from "zod";
import { IndustryDomainSchema, SeniorityBandSchema } from "@/models/resume.schema";

export const RoleTypeSchema = z.enum([
  "IC",
  "MANAGER",
  "EXECUTIVE",
  "SALES",
  "HEALTHCARE",
]);

export const EducationRequirementSchema = z.enum([
  "NONE",
  "HIGH_SCHOOL",
  "BACHELORS",
  "MASTERS",
  "PHD",
]);

export const JobSkillRequirementSchema = z.object({
  skillName: z.string(),
  minLevel: z.number().int().min(1).max(5).default(3),
  isMustHave: z.boolean().default(true),
});

export const JobNiceToHaveSkillSchema = z.object({
  skillName: z.string(),
  minLevel: z.number().int().min(1).max(5).default(2),
});

export const JobSchema = z.object({
  jobId: z.string().optional(),
  title: z.string(),
  roleTitle: z.string().optional(),
  companyName: z.string().optional().default(""),
  location: z.string().optional().nullable(),
  experienceLevel: z.string().optional().nullable(),
  seniorityExpected: SeniorityBandSchema.optional().nullable(),
  industryDomain: IndustryDomainSchema.default("GENERAL"),
  roleType: RoleTypeSchema.default("IC"),
  requiredSkills: z.array(JobSkillRequirementSchema).default([]),
  niceToHaveSkills: z.array(JobNiceToHaveSkillSchema).default([]),
  minYearsExperience: z.number().optional().nullable(),
  maxYearsExperience: z.number().optional().nullable(),
  educationRequirement: EducationRequirementSchema.default("NONE"),
  keyResponsibilities: z.array(z.string()).max(5).default([]),
  mustHaveKeywords: z.array(z.string()).default([]),
  dealbreakers: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  description: z.string().optional().default(""),
  salaryRange: z.string().optional().nullable(),
  jobType: z.string().optional().nullable(),
});

export type JobSchemaType = z.infer<typeof JobSchema>;
export type JobSkillRequirement = z.infer<typeof JobSkillRequirementSchema>;
export type RoleType = z.infer<typeof RoleTypeSchema>;

function normalizeSkillRequirements(raw: unknown): JobSkillRequirement[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return { skillName: item, minLevel: 3, isMustHave: true };
    }
    const obj = item as Record<string, unknown>;
    return {
      skillName: String(obj.skillName ?? obj.name ?? obj.skill ?? ""),
      minLevel: Number(obj.minLevel ?? 3),
      isMustHave: obj.isMustHave !== false,
    };
  }).filter((s) => s.skillName.trim());
}

function normalizeNiceToHave(raw: unknown): z.infer<typeof JobNiceToHaveSkillSchema>[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return { skillName: item, minLevel: 2 };
    }
    const obj = item as Record<string, unknown>;
    return {
      skillName: String(obj.skillName ?? obj.name ?? ""),
      minLevel: Number(obj.minLevel ?? 2),
    };
  }).filter((s) => s.skillName.trim());
}

/** Lenient parse for LLM output and legacy API shapes. */
export function parseJobSchema(raw: unknown): JobSchemaType {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const legacySkills = obj.requiredSkills ?? obj.skills ?? [];
  const requiredSkills = normalizeSkillRequirements(legacySkills);
  const niceToHaveSkills = normalizeNiceToHave(obj.niceToHaveSkills ?? []);

  return JobSchema.parse({
    jobId: obj.jobId,
    title: obj.title ?? obj.jobTitle ?? obj.roleTitle ?? "",
    roleTitle: obj.roleTitle ?? obj.title ?? obj.jobTitle ?? "",
    companyName: obj.companyName ?? obj.company ?? "",
    location: obj.location ?? null,
    experienceLevel: obj.experienceLevel ?? null,
    seniorityExpected: obj.seniorityExpected ?? null,
    industryDomain: obj.industryDomain ?? "GENERAL",
    roleType: obj.roleType ?? "IC",
    requiredSkills,
    niceToHaveSkills,
    minYearsExperience: obj.minYearsExperience ?? null,
    maxYearsExperience: obj.maxYearsExperience ?? null,
    educationRequirement: obj.educationRequirement ?? "NONE",
    keyResponsibilities: Array.isArray(obj.keyResponsibilities)
      ? obj.keyResponsibilities.slice(0, 5)
      : Array.isArray(obj.responsibilities)
        ? obj.responsibilities.slice(0, 5)
        : [],
    mustHaveKeywords: obj.mustHaveKeywords ?? [],
    dealbreakers: obj.dealbreakers ?? [],
    responsibilities: obj.responsibilities ?? [],
    requirements: obj.requirements ?? [],
    description: obj.description ?? "",
    salaryRange: obj.salaryRange ?? null,
    jobType: obj.jobType ?? null,
  });
}

/** Flat list of required skill names for backward compatibility. */
export function getRequiredSkillNames(job: JobSchemaType): string[] {
  return job.requiredSkills.map((s) => s.skillName);
}
