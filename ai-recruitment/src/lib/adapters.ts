/**
 * Adapt v1 API responses to UI component shapes.
 * All data from API goes through these adapters — no raw responses in UI.
 */

import type { CandidateProfile, ResumeVersion, InterviewSession } from "./api-client";

type RawCandidate = Record<string, unknown>;
type RawResume = Record<string, unknown>;
type RawCareerResponse = Record<string, unknown>;
type RawInterview = Record<string, unknown>;

export function adaptCandidate(raw: RawCandidate): CandidateProfile {
  return {
    id: String(raw.id ?? ""),
    name: (raw.name as string) ?? (raw.full_name as string) ?? null,
    email: (raw.email as string) ?? "",
    image: (raw.avatar_url as string) ?? (raw.avatar as string) ?? null,
    headline: (raw.headline as string) ?? null,
    phone: (raw.phone as string) ?? null,
    location: (raw.location as string) ?? null,
    city: (raw.city as string) ?? null,
    state: (raw.state as string) ?? null,
    school: (raw.school as string) ?? null,
    graduationYear: (raw.graduation_year as string) ?? null,
    linkedInUrl: (raw.linkedin_url as string) ?? null,
    githubUrl: (raw.github_url as string) ?? null,
    websiteUrl: (raw.website_url as string) ?? null,
    preferredRoles: (raw.preferred_roles as string[]) ?? [],
    salaryExpectationMin: (raw.salary_expectation_min as number) ?? null,
    salaryExpectationMax: (raw.salary_expectation_max as number) ?? null,
    visibility: (raw.visibility as string) ?? "PUBLIC",
    reputationScore: (raw.reputation_score as number) ?? 0,
    technicalScore: 0,
    softScore: 0,
  };
}

export function adaptResumeVersion(raw: RawResume): ResumeVersion {
  const suggestions = (raw.suggestions as Array<Record<string, unknown>>) ?? [];
  return {
    id: String(raw.id ?? ""),
    title: (raw.title as string) ?? (raw.file_name as string) ?? "Resume",
    roleTarget: (raw.roleTarget as string) ?? null,
    fileUrl: (raw.fileUrl as string) ?? (raw.file_url as string) ?? null,
    atsScore: (raw.atsScore as number) ?? (raw.overall_score as number) ?? null,
    status: (raw.status as string) ?? "PENDING",
    updatedAt: (raw.updatedAt as string) ?? (raw.created_at as string) ?? "",
    suggestions: suggestions.map((s) => ({
      id: String(s.id ?? ""),
      type: (s.type as string) ?? "IMPROVEMENT",
      section: (s.section as string) ?? "",
      title: (s.title as string) ?? (s.explanation as string) ?? "",
      description: (s.description as string) ?? (s.explanation as string) ?? "",
      applied: (s.applied as boolean) ?? false,
    })),
  };
}

export function adaptResumeAnalysis(raw: Record<string, unknown>): {
  resumeId: string;
  fileName: string;
  uploadedAt: string;
  atsScore: number;
  improvements: Array<{ type: string; section: string; title: string; description: string }>;
  parsed: {
    name: string;
    skills: string[];
    experience: Array<Record<string, unknown>>;
    education: Array<Record<string, unknown>>;
  };
} {
  const resume = (raw.resume as Record<string, unknown>) ?? {};
  const parsed = (raw.parsed as Record<string, unknown>) ?? {};
  const atsScore = (raw.ats_score as number) ?? 0;
  const improvements = (raw.resume_improvements as Array<Record<string, unknown>>) ?? [];

  const languages = (parsed.languages as string[]) ?? [];
  const frameworks = (parsed.frameworks as string[]) ?? [];
  const skills = [...languages, ...frameworks];

  return {
    resumeId: String(resume.id ?? ""),
    fileName: (resume.file_name as string) ?? "",
    uploadedAt: (resume.created_at as string) ?? "",
    atsScore,
    improvements: improvements.map((i) => ({
      type: (i.type as string) ?? "IMPROVEMENT",
      section: (i.section as string) ?? "",
      title: (i.explanation as string) ?? (i.suggested_text as string) ?? "",
      description: (i.explanation as string) ?? "",
    })),
    parsed: {
      name: (parsed.name as string) ?? "",
      skills,
      experience: (parsed.experience as Array<Record<string, unknown>>) ?? [],
      education: (parsed.education as Array<Record<string, unknown>>) ?? [],
    },
  };
}

export function adaptCareerPath(raw: RawCareerResponse): Array<{
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string | null;
  skills: string[];
}> {
  const stages = (raw.stages as Array<Record<string, unknown>>) ?? [];
  return stages.map((m, i) => ({
    id: String(m.id ?? `stage-${i}`),
    title: (m.title as string) ?? "",
    description: (m.key_milestones as string[] ?? []).join(". ") ?? "",
    completed: false,
    dueDate: null,
    skills: (m.required_skills as string[]) ?? [],
  }));
}

export function adaptInterview(raw: RawInterview): InterviewSession {
  const messages = (raw.messages as Array<Record<string, unknown>>) ?? [];
  return {
    id: String(raw.id ?? ""),
    title: (raw.title as string) ?? (raw.target_role as string) ?? "Mock Interview",
    type: (raw.type as string) ?? (raw.session_type as string) ?? "TECHNICAL",
    status: (raw.status as string) ?? "IN_PROGRESS",
    startedAt: (raw.startedAt as string) ?? (raw.started_at as string) ?? "",
    messages: messages.map((m, i) => ({
      id: String(m.id ?? `msg-${i}`),
      role: (m.role === "user" ? "USER" : "ASSISTANT") as string,
      content: (m.content as string) ?? "",
      createdAt: (m.created_at as string) ?? "",
    })),
  };
}
