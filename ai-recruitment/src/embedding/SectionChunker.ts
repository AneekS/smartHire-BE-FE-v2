import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import type { ResumeSchemaType } from "@/models/resume.schema";

export interface ResumeChunk {
  id: string;
  resumeVersionId: string;
  candidateId: string;
  tenantId: string;
  section: string;
  content: string;
  docType: "resume" | "job";
  skills: string[];
  seniorityBand?: string;
  industryDomain: string;
  weight: number;
  metadata: Record<string, string>;
  totalYearsExp?: number;
}

/** Phase 3 spec chunk weights */
export const CHUNK_SECTION_WEIGHTS = {
  EXPERIENCE: 1.5,
  SKILLS: 1.3,
  EDUCATION: 1.0,
  SUMMARY: 1.1,
  PROJECTS: 1.2,
  ACHIEVEMENTS: 0.75,
  FULL_TEXT: 0.5,
} as const;

const MAX_CHARS = 512 * 4;

function splitLongText(text: string, max = MAX_CHARS): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    parts.push(text.slice(start, start + max));
    start += max;
  }
  return parts;
}

export class SectionChunker {
  static chunk(
    rawText: string,
    schema: ExtractionResumeSchemaType,
    resumeVersionId: string,
    candidateId: string,
    tenantId?: string
  ): ResumeChunk[] {
    const chunks: ResumeChunk[] = [];
    const skillNames = schema.skills.map((s) => s.name);
    const resolvedTenant = tenantId ?? candidateId;
    const base = {
      resumeVersionId,
      candidateId,
      tenantId: resolvedTenant,
      docType: "resume" as const,
      skills: skillNames,
      seniorityBand: schema.seniorityBand,
      industryDomain: schema.industryDomain,
      totalYearsExp: schema.yearsOfExperience,
      metadata: {},
    };

    const push = (
      section: keyof typeof CHUNK_SECTION_WEIGHTS,
      content: string,
      meta: Record<string, string> = {}
    ) => {
      if (!content.trim()) return;
      for (const [i, part] of splitLongText(content).entries()) {
        chunks.push({
          ...base,
          id: `${resumeVersionId}_${section.toLowerCase()}_${i}`,
          section,
          content: part,
          weight: CHUNK_SECTION_WEIGHTS[section],
          metadata: meta,
        });
      }
    };

    if (schema.summary?.trim()) {
      push("SUMMARY", schema.summary);
    }

    if (skillNames.length) {
      push("SKILLS", skillNames.join(", "));
    }

    if (schema.experience.length) {
      const allExp = schema.experience
        .map((exp) =>
          [
            `${exp.title} at ${exp.company}`,
            exp.startDate,
            exp.endDate ?? (exp.isCurrent ? "Present" : ""),
            ...exp.responsibilities,
            ...exp.achievements,
            ...exp.techStack,
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n\n");
      push("EXPERIENCE", allExp);
    }

    if (schema.education.length) {
      push(
        "EDUCATION",
        schema.education
          .map((e) => [e.degree, e.field, e.institution, e.endYear].filter(Boolean).join(" — "))
          .join("\n")
      );
    }

    if (schema.projects.length) {
      push(
        "PROJECTS",
        schema.projects
          .map((p) =>
            [p.name, p.description, p.impact, ...p.techStack].filter(Boolean).join("\n")
          )
          .join("\n\n")
      );
    }

    const achievements = [
      ...schema.achievements,
      ...schema.experience.flatMap((e) => e.achievements),
    ];
    if (achievements.length) {
      push("ACHIEVEMENTS", achievements.join("\n"));
    }

    push("FULL_TEXT", rawText.slice(0, MAX_CHARS * 2));

    return chunks;
  }
}

export function chunkResume(
  resume: ResumeSchemaType,
  resumeVersionId: string,
  candidateId: string,
  tenantId?: string
): ResumeChunk[] {
  const extractionLike: ExtractionResumeSchemaType = {
    personalInfo: {
      name: resume.fullName,
      email: resume.email ?? null,
      phone: resume.phone ?? null,
      location: resume.location ?? null,
      linkedIn: null,
      github: null,
      portfolio: null,
    },
    summary: resume.summary,
    industryDomain:
      resume.industryDomain === "CREATIVE" ? "GENERAL" : resume.industryDomain,
    seniorityBand: resume.seniorityBand ?? "L1",
    yearsOfExperience: resume.yearsOfExperience ?? 0,
    skills: resume.skills.map((s) => ({
      name: s.skillName,
      domain: "OTHER",
      proficiencyLevel: s.level,
    })),
    experience: resume.experience.map((e) => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate ?? null,
      endDate: e.endDate ?? null,
      isCurrent: e.isCurrent,
      durationMonths: e.durationMonths ?? null,
      responsibilities: [],
      achievements: e.achievements.map((a) => a.description),
      techStack: [],
    })),
    education: resume.education.map((e) => ({
      institution: e.institution ?? "",
      degree: e.degree || null,
      field: e.field || null,
      startYear: null,
      endYear: e.year != null ? Number(e.year) || null : null,
      gpa: e.cgpa != null ? Number(e.cgpa) || null : null,
    })),
    projects: [],
    certifications: [],
    achievements: [],
    languages: [],
    field_confidence: resume.field_confidence,
  };

  const summaryText = [
    resume.summary,
    ...resume.experience.flatMap((e) => e.achievements.map((a) => a.description)),
  ].join("\n");

  return SectionChunker.chunk(
    summaryText,
    extractionLike,
    resumeVersionId,
    candidateId,
    tenantId
  );
}

export function chunkJob(
  job: {
    jobId: string;
    title: string;
    companyName?: string;
    description?: string;
    requirements?: string[];
    requiredSkills?: string[];
  },
  candidateId = "system"
): ResumeChunk[] {
  const text = [job.title, job.companyName, job.description, ...(job.requirements ?? [])]
    .filter(Boolean)
    .join("\n");

  const resumeVersionId = `job_${job.jobId}`;
  return splitLongText(text).map((part, i) => ({
    id: `${resumeVersionId}_jd_${i}`,
    resumeVersionId,
    candidateId,
    tenantId: candidateId,
    section: "job_description",
    content: part,
    docType: "job" as const,
    skills: job.requiredSkills ?? [],
    industryDomain: "GENERAL",
    weight: 1,
    metadata: { jobId: job.jobId, title: job.title },
  }));
}
