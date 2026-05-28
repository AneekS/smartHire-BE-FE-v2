import { z } from "zod";

export const SkillDomainSchema = z.enum([
  "FRONTEND",
  "BACKEND",
  "DATABASES",
  "DEVOPS",
  "DATA_AI",
  "MOBILE",
  "CLOUD",
  "SECURITY",
  "FINANCE",
  "HEALTHCARE",
  "SALES",
  "LEGAL",
  "GENERAL",
]);

export const IndustryDomainSchema = z.enum([
  "TECH",
  "FINANCE",
  "HEALTHCARE",
  "SALES",
  "CREATIVE",
  "LEGAL",
  "GENERAL",
]);

export const SeniorityBandSchema = z.enum(["L1", "L2", "L3", "L4", "L5", "L6"]);

export const MetricTypeSchema = z.enum([
  "%",
  "$",
  "users",
  "time",
  "team",
  "revenue",
]);

export const SkillSchema = z.object({
  skillName: z.string(),
  domain: SkillDomainSchema.default("GENERAL"),
  level: z.number().int().min(1).max(5).default(3),
  lastUsedYear: z.number().int().optional().nullable(),
  yearsWithSkill: z.number().optional().nullable(),
});

export const AchievementSchema = z.object({
  description: z.string(),
  metricType: MetricTypeSchema.optional().nullable(),
  metricValue: z.string().optional().nullable(),
});

export const ExperienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().default(false),
  durationMonths: z.number().int().optional().nullable(),
  achievements: z.array(AchievementSchema).default([]),
});

export const EducationEntrySchema = z.object({
  degree: z.string().optional().default(""),
  field: z.string().optional().default(""),
  institution: z.string().optional().default(""),
  year: z.union([z.string(), z.number()]).optional().nullable(),
  cgpa: z.union([z.string(), z.number()]).optional().nullable(),
});

export const ResumeSchema = z.object({
  fullName: z.string(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  currentTitle: z.string().optional().nullable(),
  yearsOfExperience: z.number().optional().nullable(),
  seniorityBand: SeniorityBandSchema.optional().nullable(),
  industryDomain: IndustryDomainSchema.default("GENERAL"),
  skills: z.array(SkillSchema).default([]),
  experience: z.array(ExperienceEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  summary: z.string().optional().default(""),
  parseConfidence: z.number().min(0).max(1).default(0),
  field_confidence: z.record(z.string(), z.number()).default({}),
});

export type ResumeSchemaType = z.infer<typeof ResumeSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type Achievement = z.infer<typeof AchievementSchema>;

/** Lenient parse for LLM output — fills defaults then strict-validates. */
export function parseResumeSchema(raw: unknown): ResumeSchemaType {
  const obj = typeof raw === "object" && raw !== null ? raw : {};
  const normalized = {
    fullName:
      (obj as Record<string, unknown>).fullName ??
      (obj as Record<string, unknown>).name ??
      "",
    email: (obj as Record<string, unknown>).email ?? null,
    phone: (obj as Record<string, unknown>).phone ?? null,
    location: (obj as Record<string, unknown>).location ?? null,
    currentTitle: (obj as Record<string, unknown>).currentTitle ?? null,
    yearsOfExperience: (obj as Record<string, unknown>).yearsOfExperience ?? null,
    seniorityBand: (obj as Record<string, unknown>).seniorityBand ?? null,
    industryDomain:
      (obj as Record<string, unknown>).industryDomain ?? "GENERAL",
    skills: (obj as Record<string, unknown>).skills ?? [],
    experience: (obj as Record<string, unknown>).experience ?? [],
    education: (obj as Record<string, unknown>).education ?? [],
    summary: (obj as Record<string, unknown>).summary ?? "",
    parseConfidence:
      (obj as Record<string, unknown>).parseConfidence ??
      (obj as Record<string, unknown>).confidence_score ??
      0,
    field_confidence:
      (obj as Record<string, unknown>).field_confidence ?? {},
  };
  return ResumeSchema.parse(normalized);
}
