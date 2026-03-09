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
    name: (raw.name as string) ?? null,
    email: (raw.email as string) ?? "",
    image: (raw.avatarUrl as string) ?? (raw.image as string) ?? (raw.photoUrl as string) ?? null,
    avatarUrl: (raw.avatarUrl as string) ?? null,
    headline: (raw.headline as string) ?? null,
    phone: (raw.phone as string) ?? null,
    location: (raw.location as string) ?? null,
    city: (raw.city as string) ?? null,
    country: (raw.country as string) ?? null,
    state: (raw.state as string) ?? null,
    photoUrl: (raw.photoUrl as string) ?? null,
    school: (raw.school as string) ?? null,
    graduationYear: (raw.graduationYear as string) ?? null,
    linkedInUrl: (raw.linkedInUrl as string) ?? null,
    githubUrl: (raw.githubUrl as string) ?? null,
    websiteUrl: (raw.websiteUrl as string) ?? null,
    summary: (raw.summary as string) ?? null,
    resumeUrl: (raw.resumeUrl as string) ?? null,
    // Advanced identity
    availability: (raw.availability as string) ?? null,
    workAuthorization: (raw.workAuthorization as string) ?? null,
    openToFreelance: Boolean(raw.openToFreelance),
    internshipInterest: Boolean(raw.internshipInterest),
    languagesSpoken: (raw.languagesSpoken as string[]) ?? [],
    // Preferences
    preferredRoles: (raw.preferredRoles as string[]) ?? [],
    salaryExpectationMin: (raw.salaryExpectationMin as number) ?? null,
    salaryExpectationMax: (raw.salaryExpectationMax as number) ?? null,
    visibility: (raw.visibility as string) ?? "PUBLIC",
    // Scores
    reputationScore: (raw.reputationScore as number) ?? 0,
    technicalScore: (raw.technicalScore as number) ?? 0,
    softScore: (raw.softScore as number) ?? 0,
    // Settings
    jobAlerts: (raw.jobAlerts as boolean) ?? true,
    aiSuggestions: (raw.aiSuggestions as boolean) ?? false,
    publicProfile: (raw.publicProfile as boolean) ?? true,
    // Verification
    emailVerified: Boolean(raw.emailVerified),
    phoneVerified: Boolean(raw.phoneVerified),
    profileCompleteness: (raw.profileCompleteness as number) ?? 0,
    // Relations
    educations: (raw.educations as CandidateProfile["educations"]) ?? [],
    skillRecords: (raw.skillRecords as CandidateProfile["skillRecords"]) ?? [],
    experiences: (raw.experiences as CandidateProfile["experiences"]) ?? [],
    projects: (raw.projects as CandidateProfile["projects"]) ?? [],
    certifications: (raw.certifications as CandidateProfile["certifications"]) ?? [],
    careerPreference: (raw.careerPreference as CandidateProfile["careerPreference"]) ?? null,
    privacy: (raw.privacy as CandidateProfile["privacy"]) ?? null,
    aiInsights: (raw.aiInsights as CandidateProfile["aiInsights"]) ?? null,
    reputation: (raw.reputation as CandidateProfile["reputation"]) ?? null,
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
