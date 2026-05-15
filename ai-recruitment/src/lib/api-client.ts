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

export interface PreferredRoleSignal {
  id: string;
  role: string;
  priority: number;
  confidenceScore: number;
  source: "MANUAL" | "INFERRED" | "BEHAVIORAL";
  updatedAt: string;
}

export interface PreferredRolesResponse {
  roles: PreferredRoleSignal[];
}

export interface ProfilePrivacy {
  id?: string;
  isPublic?: boolean;
  visibleToRecruiters?: boolean;
  anonymousMode?: boolean;
  hideContactInfo?: boolean;
}

export interface ReputationData {
  interviewPerformance?: number;
  recruiterFeedback?: number;
  assessmentCompletionRate?: number;
  responseRate?: number;
  overallScore?: number;
}

/** Mirrors `UserSalaryProfile` on the API (flattened onto profile). */
export interface UserSalaryProfileView {
  minSalary: number;
  maxSalary: number;
  currency: string;
  salaryType?: string;
  isNegotiable?: boolean;
  confidenceScore?: number;
}

export interface PreferredRoleItem {
  role: string;
  priority: number;
  confidenceScore: number;
  source?: string;
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
  preferredRole?: string | null;
  preferredRoles?: string[];
  preferredRoleItems?: PreferredRoleItem[];
  salaryProfile?: UserSalaryProfileView | null;
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
  privacy?: ProfilePrivacy | null;
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
  salary?: string;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE";
  jobType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "REMOTE";
  cursor?: string;
  limit?: number;
}

export interface Job {
  id: string;
  title: string;
  location: string;
  experienceLevel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE" | null;
  jobType?: string;
  skills: string[];
  postedAt: string;
  postedAgo: string;
  applicants: number;
  trending: boolean;
  matchScore: number;
  readiness: number;
  missingSkills: string[];
  salaryMatchScore?: number | null;
  salaryMatchExplanation?: string | null;
  salaryFitLabel?: string | null;
  saved?: boolean;
  company: {
    name: string;
    size?: string | null;
    industry?: string | null;
    averageSalaryL?: number | null;
    employeeRating?: number | null;
  };
}

export interface JobSearchResponse {
  jobs: Job[];
  nextCursor: string | null;
}

export interface UserSalaryProfile {
  id: string;
  minSalary: number;
  maxSalary: number;
  currency: string;
  salaryType: "MONTHLY" | "YEARLY";
  isNegotiable: boolean;
  preferredLocations: string[] | null;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedJob {
  id: string;
  title: string;
  location: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  matchScore: number;
  reasons: string[];
  missingSkills: string[];
  readinessScore: number;
  semanticScore: number;
  postedAt: string;
}

/** API may return partial payloads; consumers must use optional chaining / defaults. */
export interface JobRecommendationsResponse {
  recommendedJobs?: RecommendedJob[];
  trendingJobs?: RecommendedJob[];
  highMatchJobs?: RecommendedJob[];
  newJobs?: RecommendedJob[];
  marketIntelligence?: {
    trendingSkills?: Array<{ skill: string; demandCount: number }>;
    highDemandRoles?: Array<{ role: string; demandCount: number }>;
    topHiringCompanies?: Array<{ companyName: string; activeJobs: number }>;
  };
  nextCursor?: string | null;
}

export interface JobAlert {
  id: string;
  role: string;
  location: string | null;
  createdAt: string;
}

export type InterviewType = "technical" | "behavioral" | "system_design" | "dsa";
export type InterviewDifficulty = "easy" | "medium" | "hard";
export type InterviewStatus = "setup" | "active" | "completed" | "abandoned";

export interface InterviewSession {
  id: string;
  userId: string;
  role: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  overallScore: number | null;
  createdAt: string;
  totalQuestions: number;
}

export interface InterviewTranscriptMessage {
  id: string;
  sessionId: string;
  role: "interviewer" | "candidate";
  content: string;
  questionNumber: number | null;
  createdAt: string;
}

export interface InterviewTurnResponse {
  message: {
    id: string;
    role: "interviewer";
    content: string;
    questionNumber: number;
    createdAt: string;
  };
  questionNumber: number;
  totalQuestions: number;
  isComplete: boolean;
}

export interface InterviewFeedbackReport {
  overallScore: number | null;
  technicalScore: number | null;
  communicationScore: number | null;
  depthScore: number | null;
  strengths: string[];
  improvements: string[];
  recommendedResources: string[];
  summary: string;
  createdAt: string;
}

export interface InterviewFeedbackResponse {
  session: Omit<InterviewSession, "userId">;
  feedback: InterviewFeedbackReport | null;
  status: "ready" | "generating";
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
  search: (params: JobSearchParams) =>
    request<JobSearchResponse>(
      `/api/jobs/search?${new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      )}`
    ),
  apply: (data: { job_id: string; cover_note?: string }) =>
    request<{ application: Record<string, unknown> }>(
      "/api/jobs/apply",
      { method: "POST", body: JSON.stringify(data) }
    ),
  save: (jobId: string) =>
    request<{ ok: boolean }>("/api/jobs/save", {
      method: "POST",
      body: JSON.stringify({ jobId }),
    }),
  unsave: (jobId: string) =>
    request<{ ok: boolean }>(`/api/jobs/save?jobId=${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    }),
  saved: () => request<{ jobs: Job[] }>("/api/jobs/saved"),
  createAlert: (data: { role: string; location?: string }) =>
    request<{ ok: boolean }>("/api/jobs/alerts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listAlerts: () => request<{ alerts: JobAlert[] }>("/api/jobs/alerts"),
  recommendations: (params?: { cursor?: string; limit?: number }) =>
    request<JobRecommendationsResponse>(
      `/api/jobs/recommendations?${new URLSearchParams(
        Object.entries(params ?? {}).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      )}`
    ),
  trackBehaviorEvent: (data: {
    jobId?: string;
    eventType: "JOB_VIEW" | "JOB_CLICK" | "JOB_APPLICATION" | "JOB_SAVE" | "JOB_IGNORE";
    metadata?: Record<string, unknown>;
  }) =>
    request<{ event: Record<string, unknown> }>("/api/jobs/behavior-events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const preferredRolesApi = {
  list: () => request<PreferredRolesResponse>("/api/preferred-roles"),
  add: (role: string, priority: number) =>
    request<PreferredRolesResponse>("/api/preferred-roles", {
      method: "POST",
      body: JSON.stringify({ role, priority }),
    }),
  remove: (id: string) =>
    request<PreferredRolesResponse>(`/api/preferred-roles/${id}`, {
      method: "DELETE",
    }),
};

export const recruiterApi = {
  recommendedCandidates: (params: { jobId: string; limit?: number }) =>
    request<{
      candidates: Array<{
        candidateId: string;
        name: string;
        email: string;
        location: string | null;
        matchScore: number;
        missingSkills: string[];
        readinessScore: number;
      }>;
    }>(
      `/api/recruiter/recommended-candidates?${new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      )}`
    ),
};

export const salaryApi = {
  get: () => request<{ profile: UserSalaryProfile | null }>("/salary"),
  upsert: (payload: {
    minSalary: number;
    maxSalary: number;
    currency?: string;
    salaryType?: "MONTHLY" | "YEARLY";
    isNegotiable?: boolean;
    preferredLocations?: string[];
    confidenceScore?: number;
  }) =>
    request<{ profile: UserSalaryProfile }>("/salary", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  remove: () =>
    request<{ profile: null }>("/salary", {
      method: "DELETE",
    }),
};

// ─── Application Tracker ─────────────────────────────────────────────────────

export type TrackerApplicationStatus =
  | "APPLIED"
  | "RESUME_VIEWED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_COMPLETED"
  | "OFFER"
  | "REJECTED"
  | "HIRED"
  | "WITHDRAWN";

export interface TrackerApplication {
  id: string;
  jobId: string;
  candidateId: string;
  status: TrackerApplicationStatus;
  aiScore: number | null;
  interviewProbability: number | null;
  applicationHealthScore: number | null;
  readinessScore: number | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    location: string;
    type: string;
    workMode: string | null;
    salary: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    requiredSkills: string[];
    company: {
      id: string;
      name: string;
      logo: string | null;
      industry: string | null;
    };
  };
}

export interface TrackerApplicationDetail extends TrackerApplication {
  aiNotes: string | null;
  timeline: Array<{
    id: string;
    status: TrackerApplicationStatus;
    updatedBy: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  recruiterActivities: Array<{
    id: string;
    activityType: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  assessments: Array<{
    id: string;
    title: string;
    type: string;
    score: number | null;
    maxScore: number | null;
    deadline: string | null;
    status: string;
    completedAt: string | null;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    authorId: string;
    authorRole: string;
    createdAt: string;
    updatedAt: string;
  }>;
  offer: {
    id: string;
    salary: number | null;
    currency: string | null;
    benefits: string[];
    startDate: string | null;
    expiresAt: string | null;
    status: string;
    createdAt: string;
  } | null;
  interview: {
    id: string;
    scheduledAt: string;
    type: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface TrackerAnalytics {
  applicationsSent: number;
  resumeViewed: number;
  shortlistedCount: number;
  interviewCount: number;
  offerCount: number;
  hiredCount: number;
  rejectedCount: number;
  withdrawnCount: number;
  avgHealthScore: number;
  statusBreakdown: Record<string, number>;
  totalActive: number;
}

export interface TrackerReminder {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
  applicationId?: string;
  dueDate?: string;
}

export const applicationsApi = {
  list: (params?: { status?: TrackerApplicationStatus; cursor?: string; limit?: number }) =>
    request<{ applications: TrackerApplication[]; nextCursor: string | null }>(
      `/applications?${new URLSearchParams(
        Object.entries(params ?? {}).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      )}`
    ),

  getDetail: (id: string) =>
    request<TrackerApplicationDetail>(`/applications/${encodeURIComponent(id)}`),

  apply: (data: { job_id: string; cover_note?: string }) =>
    request<{ application: TrackerApplication }>("/applications", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, data: { status: TrackerApplicationStatus; metadata?: Record<string, unknown> }) =>
    request<TrackerApplicationDetail>(`/applications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  addNote: (id: string, content: string) =>
    request<{ note: { id: string; content: string; createdAt: string } }>(
      `/applications/${encodeURIComponent(id)}/notes`,
      { method: "POST", body: JSON.stringify({ content }) }
    ),

  withdraw: (id: string) =>
    request<TrackerApplicationDetail>(
      `/applications/${encodeURIComponent(id)}/withdraw`,
      { method: "POST" }
    ),

  analytics: () =>
    request<TrackerAnalytics>("/applications/analytics"),

  reminders: () =>
    request<{ reminders: TrackerReminder[] }>("/applications/reminders"),
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

export interface CreateInterviewInput {
  role: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  durationMinutes: number;
}

export const interviewsApi = {
  list: () =>
    request<{ sessions: InterviewSession[] }>("/api/interviews").then((r) => r.sessions),

  create: (data: CreateInterviewInput) =>
    request<{ session: InterviewSession }>("/api/interviews", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((r) => r.session),

  get: (sessionId: string) =>
    request<{
      session: InterviewSession;
      messages: InterviewTranscriptMessage[];
    }>(`/api/interviews/${sessionId}`),

  sendMessage: (
    sessionId: string,
    content: string,
    questionNumber: number,
  ) =>
    request<InterviewTurnResponse>(`/api/interviews/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify({ content, questionNumber }),
    }),

  end: (sessionId: string) =>
    request<{ success: true }>(`/api/interviews/${sessionId}/end`, {
      method: "POST",
    }),

  feedback: (sessionId: string) =>
    request<InterviewFeedbackResponse>(`/api/interviews/${sessionId}/feedback`),
};
