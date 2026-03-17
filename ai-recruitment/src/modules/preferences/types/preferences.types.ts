export type ExperienceLevel = "ENTRY" | "MID" | "SENIOR" | "LEAD";
export type WorkType = "REMOTE" | "HYBRID" | "ONSITE" | "CONTRACT" | "FREELANCE";
export type SalaryVisibility = "PUBLIC" | "RANGE_ONLY" | "PRIVATE";

export interface PreferencePayload {
  primaryRole: string;
  secondaryRoles: string[];
  exploratoryRoles: string[];
  experienceLevel: ExperienceLevel;
  preferredIndustries: string[];
  preferredWorkTypes: WorkType[];
  preferredLocations: string[];
  salaryMin: number;
  salaryTarget: number;
  salaryMax: number;
  salaryVisibility: SalaryVisibility;
}

export interface SalaryInsightQuery {
  role: string;
  location: string;
  experience: ExperienceLevel;
}

export interface RoleSuggestionInput {
  resumeData?: string;
  userSkills: string[];
  githubProjects: string[];
  previousRoles: string[];
}

export interface RoleSuggestionResult {
  suggestedRoles: string[];
  confidence: number;
  source: "ai" | "rule-based";
}

export interface CareerTrajectoryInsight {
  currentRole: string;
  nextRole: string;
  estimatedSalary: number;
  timeline: string;
  skillsToAcquire: string[];
}

export interface RecruiterFilterInput {
  preferredRole?: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: ExperienceLevel;
  workType?: WorkType;
  industryPreference?: string;
  page?: number;
  limit?: number;
}
