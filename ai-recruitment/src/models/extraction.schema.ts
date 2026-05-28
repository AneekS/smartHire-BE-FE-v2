import { z } from "zod";

export const ExtractionSkillSchema = z.object({
  name: z.string(),
  domain: z.enum([
    "FRONTEND",
    "BACKEND",
    "DATABASES",
    "DEVOPS",
    "DATA_AI",
    "CLOUD",
    "MOBILE",
    "SECURITY",
    "SOFT_SKILLS",
    "OTHER",
  ]),
  proficiencyLevel: z.number().int().min(1).max(5),
});

export const ExtractionExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  durationMonths: z.number().nullable(),
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()),
  techStack: z.array(z.string()),
});

export const ExtractionEducationSchema = z.object({
  institution: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  startYear: z.number().nullable(),
  endYear: z.number().nullable(),
  gpa: z.number().nullable(),
});

export const ExtractionProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  techStack: z.array(z.string()),
  url: z.string().nullable(),
  impact: z.string().nullable(),
});

export const ExtractionResumeSchema = z.object({
  personalInfo: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    linkedIn: z.string().nullable(),
    github: z.string().nullable(),
    portfolio: z.string().nullable(),
  }),
  summary: z.string().nullable(),
  industryDomain: z.enum(["TECH", "FINANCE", "HEALTHCARE", "SALES", "LEGAL", "GENERAL"]),
  seniorityBand: z.enum(["L1", "L2", "L3", "L4", "L5", "L6"]),
  yearsOfExperience: z.number(),
  skills: z.array(ExtractionSkillSchema),
  experience: z.array(ExtractionExperienceSchema),
  education: z.array(ExtractionEducationSchema),
  projects: z.array(ExtractionProjectSchema),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable(),
      year: z.number().nullable(),
    })
  ),
  achievements: z.array(z.string()),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.enum(["native", "fluent", "professional", "basic"]),
    })
  ),
  field_confidence: z.record(z.string(), z.number()),
});

export type ExtractionResumeSchemaType = z.infer<typeof ExtractionResumeSchema>;

export function emptyExtractionSchema(): ExtractionResumeSchemaType {
  return {
    personalInfo: {
      name: null,
      email: null,
      phone: null,
      location: null,
      linkedIn: null,
      github: null,
      portfolio: null,
    },
    summary: null,
    industryDomain: "GENERAL",
    seniorityBand: "L1",
    yearsOfExperience: 0,
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    achievements: [],
    languages: [],
    field_confidence: {},
  };
}
