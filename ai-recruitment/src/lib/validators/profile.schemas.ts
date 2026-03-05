/**
 * Profile Feature - Zod validation schemas
 * Used by both API routes (server) and forms (client, via shared import).
 */

import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────────────

const urlOrEmpty = z.string().url().or(z.literal("")).optional();
const yearString = z.string().regex(/^\d{4}$/, "Must be a 4-digit year");
const dateString = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional();

// ─── 1. Basic Identity ───────────────────────────────────────────────────────

export const BasicIdentitySchema = z.object({
  name:          z.string().min(1, "Name is required").max(120).optional(),
  headline:      z.string().max(200).optional(),
  phone:         z.string().max(30).optional(),
  location:      z.string().max(200).optional(),
  city:          z.string().max(100).optional(),
  country:       z.string().max(100).optional(),
  photoUrl:      urlOrEmpty,
  linkedInUrl:   urlOrEmpty,
  githubUrl:     urlOrEmpty,
  websiteUrl:    urlOrEmpty,
  summary:       z.string().max(2000).optional(),
  // Advanced
  availability:  z.enum(["IMMEDIATE", "TWO_WEEKS", "ONE_MONTH", "THREE_MONTHS"]).optional(),
  workAuthorization: z.enum(["CITIZEN", "PERMANENT_RESIDENT", "VISA", "OPT"]).optional(),
  openToFreelance: z.boolean().optional(),
  internshipInterest: z.boolean().optional(),
  languagesSpoken: z.array(z.string()).optional(),
});

// ─── 2. Education ────────────────────────────────────────────────────────────

export const EducationSchema = z.object({
  school:      z.string().min(1, "School name is required").max(200),
  degree:      z.string().min(1, "Degree is required").max(200),
  field:       z.string().min(1, "Field of study is required").max(200),
  startYear:   yearString,
  endYear:     yearString.optional(),
  isCurrent:   z.boolean().optional().default(false),
  cgpa:        z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
  order:       z.number().int().optional(),
});

export const EducationUpdateSchema = EducationSchema.partial().extend({
  id: z.string().cuid(),
});

// ─── 3. Work Experience ──────────────────────────────────────────────────────

export const ExperienceSchema = z.object({
  company:        z.string().min(1, "Company name is required").max(200),
  jobTitle:       z.string().min(1, "Job title is required").max(200),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"]).optional(),
  location:       z.string().max(200).optional(),
  startDate:      z.string().min(1, "Start date is required"),
  endDate:        z.string().optional(),
  isCurrent:      z.boolean().optional().default(false),
  description:    z.string().max(5000).optional(),
  achievements:   z.array(z.string().max(500)).optional().default([]),
  technologies:   z.array(z.string().max(100)).optional().default([]),
  order:          z.number().int().optional(),
});

export const ExperienceUpdateSchema = ExperienceSchema.partial().extend({
  id: z.string().cuid(),
});

// ─── 4. Skills ───────────────────────────────────────────────────────────────

export const SkillSchema = z.object({
  name:        z.string().min(1, "Skill name is required").max(100),
  level:       z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional().default("INTERMEDIATE"),
  category:    z.string().max(100).optional(),
  isSoftSkill: z.boolean().optional().default(false),
});

export const BulkSkillSchema = z.object({
  skills: z.array(SkillSchema).min(1).max(100),
});

// ─── 5. Projects ─────────────────────────────────────────────────────────────

export const ProjectSchema = z.object({
  title:        z.string().min(1, "Project title is required").max(200),
  description:  z.string().max(3000).optional(),
  technologies: z.array(z.string().max(100)).optional().default([]),
  repoUrl:      urlOrEmpty,
  demoUrl:      urlOrEmpty,
  teamRole:     z.string().max(100).optional(),
  startDate:    z.string().optional(),
  endDate:      z.string().optional(),
  isCurrent:    z.boolean().optional().default(false),
  order:        z.number().int().optional(),
});

export const ProjectUpdateSchema = ProjectSchema.partial().extend({
  id: z.string().cuid(),
});

// ─── 6. Certifications ───────────────────────────────────────────────────────

export const CertificationSchema = z.object({
  name:          z.string().min(1, "Certification name is required").max(200),
  issuer:        z.string().min(1, "Issuing organization is required").max(200),
  issueDate:     z.string().optional(),
  expiryDate:    z.string().optional(),
  credentialId:  z.string().max(200).optional(),
  credentialUrl: urlOrEmpty,
});

export const CertificationUpdateSchema = CertificationSchema.partial().extend({
  id: z.string().cuid(),
});

// ─── 7. Career Preferences ───────────────────────────────────────────────────

export const CareerPreferenceSchema = z.object({
  preferredRoles:       z.array(z.string().max(100)).optional().default([]),
  preferredIndustries:  z.array(z.string().max(100)).optional().default([]),
  preferredLocations:   z.array(z.string().max(100)).optional().default([]),
  workMode:             z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  salaryMin:            z.number().int().min(0).optional(),
  salaryMax:            z.number().int().min(0).optional(),
  currency:             z.string().max(10).optional().default("USD"),
  openToRelocation:     z.boolean().optional().default(false),
});

// ─── 8. Privacy ──────────────────────────────────────────────────────────────

export const PrivacySchema = z.object({
  isPublic:            z.boolean().optional(),
  visibleToRecruiters: z.boolean().optional(),
  anonymousMode:       z.boolean().optional(),
  hideContactInfo:     z.boolean().optional(),
});

// ─── 9. Delete ───────────────────────────────────────────────────────────────

export const DeleteByIdSchema = z.object({
  id: z.string().cuid("Invalid record ID"),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type BasicIdentityInput     = z.infer<typeof BasicIdentitySchema>;
export type EducationInput         = z.infer<typeof EducationSchema>;
export type EducationUpdateInput   = z.infer<typeof EducationUpdateSchema>;
export type ExperienceInput        = z.infer<typeof ExperienceSchema>;
export type ExperienceUpdateInput  = z.infer<typeof ExperienceUpdateSchema>;
export type SkillInput             = z.infer<typeof SkillSchema>;
export type ProjectInput           = z.infer<typeof ProjectSchema>;
export type ProjectUpdateInput     = z.infer<typeof ProjectUpdateSchema>;
export type CertificationInput     = z.infer<typeof CertificationSchema>;
export type CertificationUpdateInput = z.infer<typeof CertificationUpdateSchema>;
export type CareerPreferenceInput  = z.infer<typeof CareerPreferenceSchema>;
export type PrivacyInput           = z.infer<typeof PrivacySchema>;
