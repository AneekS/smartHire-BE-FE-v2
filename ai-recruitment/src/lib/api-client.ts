/**
 * Centralized API client — ALL frontend API calls go through here.
 * Never call fetch() directly in components.
 */

const BASE = "/api/v1";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((error as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CandidateProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  headline: string | null;
  phone: string | null;
  location: string | null;
  city?: string | null;
  state?: string | null;
  school?: string | null;
  graduationYear?: string | null;
  linkedInUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  preferredRoles?: string[];
  salaryExpectationMin?: number | null;
  salaryExpectationMax?: number | null;
  visibility?: string;
  reputationScore?: number;
  technicalScore?: number;
  softScore?: number;
}

export interface ResumeVersion {
  id: string;
  title: string;
  roleTarget: string | null;
  fileUrl: string | null;
  atsScore: number | null;
  status: string;
  updatedAt: string;
  suggestions: Array<{
    id: string;
    type: string;
    section: string;
    title: string;
    description: string;
    applied: boolean;
  }>;
}

export interface ResumeUploadResponse {
  resume: { id: string; file_name: string; created_at: string };
  parsed: Record<string, unknown>;
  ats_score: number;
  suggestions_count?: number;
}

export interface JobSearchParams {
  role?: string;
  location?: string;
  skills?: string;
  experience?: string;
  page?: number;
  limit?: number;
}

export interface Job {
  id: string;
  title: string;
  company_name?: string;
  city?: string;
  state?: string;
  is_remote?: boolean;
  salary_min?: number;
  salary_max?: number;
  required_skills?: string[];
  experience_min?: number;
  description?: string;
  created_at?: string;
}

export interface InterviewSession {
  id: string;
  title: string;
  type: string;
  status: string;
  startedAt: string;
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
}

export interface CareerStage {
  level: string;
  title: string;
  timeline_months: number;
  salary_range?: { min: number; max: number; currency: string };
  required_skills?: string[];
  key_milestones?: string[];
}

export interface SkillGapResult {
  readiness_score: number;
  readiness_label?: string;
  missing_skills: Array<{
    skill: string;
    priority: string;
    reason: string;
    estimated_hours?: number;
    learning_resources?: Array<{ type: string; title: string; url: string; is_free: boolean }>;
  }>;
  strong_skills?: string[];
  summary?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export const authApi = {
  signin: (data: { email: string; password: string }) =>
    request<{ user?: Record<string, unknown>; requireEmailVerification?: boolean }>(
      "/auth/signin",
      { method: "POST", body: JSON.stringify({ action: "sign-in", ...data }) }
    ),

  signup: (data: { email: string; password: string; name: string; phone?: string }) =>
    request<{
      user?: Record<string, unknown>;
      candidate?: Record<string, unknown> | null;
      requireEmailVerification?: boolean;
    }>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Candidates ─────────────────────────────────────────────────────────────

export const candidatesApi = {
  getProfile: () => request<Record<string, unknown>>("/candidates/profile"),
  updateProfile: (data: Partial<CandidateProfile>) =>
    request<Record<string, unknown>>("/candidates/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Resumes ───────────────────────────────────────────────────────────────

export const resumesApi = {
  list: () => request<ResumeVersion[]>("/resumes"),

  upload: (formData: FormData) =>
    fetch(`${BASE}/resumes/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${r.status}`);
      }
      return r.json();
    }) as Promise<ResumeUploadResponse>,

  getScoreForJob: (jobId: string) =>
    request<{
      score: number;
      matched: string[];
      missing: string[];
      suggestions?: Record<string, unknown>[];
    }>(`/resumes/score/${jobId}`),
};

// ─── Jobs ──────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const search = params
      ? `?${new URLSearchParams(params as Record<string, string>)}`
      : "";
    return request<{ jobs: Job[]; page?: number; limit?: number }>(`/jobs${search}`);
  },
  search: (params: JobSearchParams) =>
    request<{ jobs: Job[]; page?: number; limit?: number }>(
      `/jobs/search?${new URLSearchParams(params as Record<string, string>)}`
    ),
  apply: (data: { job_id: string; cover_note?: string }) =>
    request<{ application: Record<string, unknown>; ats_score?: number }>(
      "/jobs/apply",
      { method: "POST", body: JSON.stringify(data) }
    ),
};

// ─── Skills & Career ────────────────────────────────────────────────────────

export const skillsApi = {
  gapAnalysis: (data: { target_role: string }) =>
    request<SkillGapResult>("/skills/gap-analysis", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const careerApi = {
  getPath: (data: { target_role: string }) =>
    request<{
      stages: CareerStage[];
      total_years?: number;
      market_insights?: string;
      top_hiring_cities?: string[];
    }>("/career/path", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Interviews ────────────────────────────────────────────────────────────

export const interviewsApi = {
  list: () => request<InterviewSession[]>("/interviews/mock"),

  start: (data: { target_role?: string; session_type?: string }) =>
    request<InterviewSession>("/interviews/mock/start", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  streamMessage: async (
    sessionId: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    targetRole: string,
    sessionType: string,
    onChunk: (chunk: string) => void
  ) => {
    const res = await fetch(`${BASE}/interviews/mock`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        messages,
        target_role: targetRole,
        session_type: sessionType,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  },
};
