import type { ResumeSchemaType } from "@/models/resume.schema";

/** UI shape used by useResumeStore / ResumeEditorPanel (legacy ParserService format). */
export interface ParsedResumeUI {
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    location: string;
    bullets: Array<{ id: string; text: string }>;
  }>;
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    startDate: string;
    endDate: string;
    gpa: string;
    location: string;
  }>;
  skills: Array<{ id: string; name: string; category: string }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    techStack: string[];
    bullets: Array<{ id: string; text: string }>;
    liveUrl: string;
    repoUrl: string;
    startDate: string;
    endDate: string;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
  }>;
}

export function resumeSchemaToUI(resume: ResumeSchemaType): ParsedResumeUI {
  return {
    contactInfo: {
      name: resume.fullName,
      email: resume.email ?? "",
      phone: resume.phone ?? "",
      location: resume.location ?? "",
      linkedin: "",
      github: "",
      website: "",
    },
    summary: resume.summary ?? "",
    experience: resume.experience.map((exp, i) => ({
      id: `exp_${i + 1}`,
      title: exp.title,
      company: exp.company,
      startDate: exp.startDate ?? "",
      endDate: exp.isCurrent ? "Present" : (exp.endDate ?? ""),
      location: "",
      bullets: exp.achievements.map((a, j) => ({
        id: `b_${i}_${j}`,
        text: a.description,
      })),
    })),
    education: resume.education.map((edu, i) => ({
      id: `edu_${i + 1}`,
      degree: edu.degree ?? "",
      institution: edu.institution ?? "",
      startDate: "",
      endDate: edu.year != null ? String(edu.year) : "",
      gpa: edu.cgpa != null ? String(edu.cgpa) : "",
      location: "",
    })),
    skills: resume.skills.map((s, i) => ({
      id: `s_${i + 1}`,
      name: s.skillName,
      category: s.domain,
    })),
    projects: [],
    certifications: [],
  };
}

export function uiToResumeSchema(ui: ParsedResumeUI): ResumeSchemaType {
  return {
    fullName: ui.contactInfo.name,
    email: ui.contactInfo.email || null,
    phone: ui.contactInfo.phone || null,
    location: ui.contactInfo.location || null,
    currentTitle: ui.experience[0]?.title ?? null,
    yearsOfExperience: null,
    seniorityBand: null,
    industryDomain: "GENERAL",
    summary: ui.summary,
    skills: ui.skills.map((s) => ({
      skillName: s.name,
      domain: "GENERAL",
      level: 3,
      lastUsedYear: null,
      yearsWithSkill: null,
    })),
    experience: ui.experience.map((exp) => ({
      company: exp.company,
      title: exp.title,
      startDate: exp.startDate || null,
      endDate: exp.endDate === "Present" ? null : exp.endDate || null,
      isCurrent: exp.endDate === "Present",
      durationMonths: null,
      achievements: exp.bullets.map((b) => ({ description: b.text })),
    })),
    education: ui.education.map((edu) => ({
      degree: edu.degree,
      field: "",
      institution: edu.institution,
      year: edu.endDate || null,
      cgpa: edu.gpa || null,
    })),
    parseConfidence: 0.5,
    field_confidence: {},
  };
}

/** Re-export for backward compatibility with existing imports. */
export type ParsedResume = ParsedResumeUI;
