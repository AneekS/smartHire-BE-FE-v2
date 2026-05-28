import type { ParsedResumeUI } from "@/models/adapters/resume-ui.adapter";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";

const LEGACY_SKILL_DOMAINS = new Set([
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

function toLegacySkillDomain(
  domain: ExtractionResumeSchemaType["skills"][0]["domain"]
): ResumeSchemaType["skills"][0]["domain"] {
  if (LEGACY_SKILL_DOMAINS.has(domain)) {
    return domain as ResumeSchemaType["skills"][0]["domain"];
  }
  return "GENERAL";
}

export function extractionToLegacy(
  schema: ExtractionResumeSchemaType,
  parseConfidence: number
): ResumeSchemaType {
  const currentTitle = schema.experience.find((e) => e.isCurrent)?.title ?? schema.experience[0]?.title ?? null;

  return {
    fullName: schema.personalInfo.name ?? "",
    email: schema.personalInfo.email,
    phone: schema.personalInfo.phone,
    location: schema.personalInfo.location,
    currentTitle,
    yearsOfExperience: schema.yearsOfExperience,
    seniorityBand: schema.seniorityBand,
    industryDomain: schema.industryDomain,
    summary: schema.summary ?? "",
    skills: schema.skills.map((s) => ({
      skillName: s.name,
      domain: toLegacySkillDomain(s.domain),
      level: s.proficiencyLevel,
      lastUsedYear: null,
      yearsWithSkill: null,
    })),
    experience: schema.experience.map((exp) => ({
      company: exp.company,
      title: exp.title,
      startDate: exp.startDate,
      endDate: exp.endDate,
      isCurrent: exp.isCurrent,
      durationMonths: exp.durationMonths,
      achievements: [...exp.responsibilities, ...exp.achievements].map((description) => ({
        description,
      })),
    })),
    education: schema.education.map((edu) => ({
      degree: edu.degree ?? "",
      field: edu.field ?? "",
      institution: edu.institution,
      year: edu.endYear ?? edu.startYear ?? null,
      cgpa: edu.gpa ?? null,
    })),
    parseConfidence,
    field_confidence: schema.field_confidence,
  };
}

export function extractionToUI(schema: ExtractionResumeSchemaType): ParsedResumeUI {
  return {
    contactInfo: {
      name: schema.personalInfo.name ?? "",
      email: schema.personalInfo.email ?? "",
      phone: schema.personalInfo.phone ?? "",
      location: schema.personalInfo.location ?? "",
      linkedin: schema.personalInfo.linkedIn ?? "",
      github: schema.personalInfo.github ?? "",
      website: schema.personalInfo.portfolio ?? "",
    },
    summary: schema.summary ?? "",
    experience: schema.experience.map((exp, i) => ({
      id: `exp_${i + 1}`,
      title: exp.title,
      company: exp.company,
      startDate: exp.startDate ?? "",
      endDate: exp.isCurrent ? "Present" : (exp.endDate ?? ""),
      location: "",
      bullets: [...exp.responsibilities, ...exp.achievements].map((text, j) => ({
        id: `b_${i}_${j}`,
        text,
      })),
    })),
    education: schema.education.map((edu, i) => ({
      id: `edu_${i + 1}`,
      degree: edu.degree ?? "",
      institution: edu.institution,
      startDate: edu.startYear != null ? String(edu.startYear) : "",
      endDate: edu.endYear != null ? String(edu.endYear) : "",
      gpa: edu.gpa != null ? String(edu.gpa) : "",
      location: "",
    })),
    skills: schema.skills.map((s, i) => ({
      id: `s_${i + 1}`,
      name: s.name,
      category: s.domain,
    })),
    projects: schema.projects.map((p, i) => ({
      id: `proj_${i + 1}`,
      name: p.name,
      description: p.description,
      techStack: p.techStack,
      bullets: p.impact ? [{ id: `pb_${i}_0`, text: p.impact }] : [],
      liveUrl: p.url ?? "",
      repoUrl: "",
      startDate: "",
      endDate: "",
    })),
    certifications: schema.certifications.map((c, i) => ({
      id: `cert_${i + 1}`,
      name: c.name,
      issuer: c.issuer ?? "",
      date: c.year != null ? String(c.year) : "",
    })),
  };
}
