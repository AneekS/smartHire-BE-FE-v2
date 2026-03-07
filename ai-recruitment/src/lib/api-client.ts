/**
 * Centralized API client — ALL frontend API calls go through here.
 * Never call fetch() directly in components.
 */

const BASE = "/api/v1";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith("/api/") ? endpoint : `${BASE}${endpoint}`;
  const res = await fetch(url, {
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

export interface EducationRecord {
  id?: string;
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear?: string | null;
  isCurrent?: boolean;
  cgpa?: string | null;
  description?: string | null;
}

export interface ExperienceRecord {
  id?: string;
  company: string;
  jobTitle: string;
  employmentType?: string | null;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  achievements?: string[];
  technologies?: string[];
}

export interface SkillRecord {
  id?: string;
  name: string;
  level?: string;
  category?: string | null;
  isSoftSkill?: boolean;
}

export interface ProjectRecord {
  id?: string;
  title: string;
  description?: string | null;
  technologies?: string[];
  repoUrl?: string | null;
  demoUrl?: string | null;
  teamRole?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
}

export interface CertificationRecord {
  id?: string;
  name: string;
  issuer: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
}

export interface CareerPreference {
  id?: string;
  preferredRoles?: string[];
  preferredIndustries?: string[];
  preferredLocations?: string[];
  workMode?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  openToRelocation?: boolean;
}

export interface ProfilePrivacy {
  id?: string;
  isPublic?: boolean;
  visibleToRecruiters?: boolean;
  anonymousMode?: boolean;
  hideContactInfo?: boolean;
}

export interface AIInsights {
  extractedSkills?: string[];
  experienceSummary?: string | null;
  careerLevel?: string | null;
  roleReadinessScore?: number | null;
  skillStrengthDistribution?: Record<string, number>;
  suggestedImprovements?: string[];
  lastAnalyzedAt?: string | null;
}

export interface ReputationData {
  interviewPerformance?: number;
  recruiterFeedback?: number;
  assessmentCompletionRate?: number;
  responseRate?: number;
  overallScore?: number;
}

export interface CandidateProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  headline: string | null;
  phone: string | null;
  location: string | null;
  city?: string | null;
  country?: string | null;
  state?: string | null;
  photoUrl?: string | null;
  avatarUrl?: string | null;           // user-uploaded avatar
  school?: string | null;
  graduationYear?: string | null;
  linkedInUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  summary?: string | null;
  // Advanced identity
  availability?: string | null;
  workAuthorization?: string | null;
  openToFreelance?: boolean;
  internshipInterest?: boolean;
  languagesSpoken?: string[];
  // Preferences
  preferredRoles?: string[];
  salaryExpectationMin?: number | null;
  salaryExpectationMax?: number | null;
  visibility?: string;
  // Scores
  reputationScore?: number;
  technicalScore?: number;
  softScore?: number;
  // Settings
  jobAlerts?: boolean;
  aiSuggestions?: boolean;
  publicProfile?: boolean;
  // Verification
  emailVerified?: boolean;
  phoneVerified?: boolean;
  // Profile state
  profileCompleteness?: number;
  resumeUrl?: string | null;
  // Relations
  educations?: EducationRecord[];
  skillRecords?: SkillRecord[];
  experiences?: ExperienceRecord[];
  projects?: ProjectRecord[];
  certifications?: CertificationRecord[];
  careerPreference?: CareerPreference | null;
  privacy?: ProfilePrivacy | null;
  aiInsights?: AIInsights | null;
  reputation?: ReputationData | null;
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

// ─── Connected Accounts ────────────────────────────────────────────────────

export type AccountProvider =
  | "GITHUB"
  | "LINKEDIN"
  | "GOOGLE"
  | "HUBSPOT"
  | "SLACK"
  | "ZOOM"
  | "PORTFOLIO"
  | "WEBSITE"
  | "TWITTER"
  | "KAGGLE"
  | "LEETCODE";

export interface ConnectedAccount {
  id: string;
  candidateId: string;
  provider: AccountProvider;
  username?: string | null;
  profileUrl: string | null;
  isOAuth: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
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

// ─── Avatar ───────────────────────────────────────────────────────────────

export const avatarApi = {
  upload: (file: File): Promise<{ avatarUrl: string }> => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`/api/profile/avatar`, {
      method: "POST",
      credentials: "include",
      body: form,
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${r.status}`);
      }
      return r.json();
    });
  },

  remove: (): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>("/api/profile/avatar", { method: "DELETE" }),
};

// ─── Connected Accounts ──────────────────────────────────────────────────────

export const connectedAccountsApi = {
  list: () => request<ConnectedAccount[]>("/api/profile/connected-accounts"),

  upsert: (data: {
    provider: AccountProvider;
    profileUrl: string;
    username?: string;
    isOAuth?: boolean;
  }) =>
    request<ConnectedAccount>("/api/profile/connected-accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (provider: AccountProvider) =>
    request<{ ok: boolean }>(`/api/profile/connected-accounts?provider=${provider}`, {
      method: "DELETE",
    }),
};

// ─── Integrations (OAuth-backed connections) ─────────────────────────────────
// These routes live at /api/integrations/* (NOT under /api/v1)

export const integrationsApi = {
  /** Returns the provider's OAuth authorization URL; redirect the user to it. */
  getOAuthUrl: (provider: AccountProvider): Promise<{ url: string }> =>
    fetch(`/api/integrations/oauth-url?provider=${provider}`, {
      credentials: "include",
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${r.status}`);
      }
      return r.json();
    }),

  /** Removes a connected OAuth integration. */
  disconnect: (provider: AccountProvider): Promise<{ ok: boolean }> =>
    fetch(`/api/integrations/disconnect?provider=${provider}`, {
      method: "DELETE",
      credentials: "include",
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${r.status}`);
      }
      return r.json();
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
