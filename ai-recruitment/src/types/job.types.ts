import type {
  IndustryProfile,
  SeniorityBand,
  JobType,
  WorkMode,
} from "@prisma/client";
import type { JobAtsScore } from "@/types/ats.types";

export type { IndustryProfile, SeniorityBand, JobType, WorkMode };

/** salaryMin/salaryMax are stored in cents — format in UI only. */
export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  type: JobType;
  workMode?: WorkMode | null;
  requiredSkills: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  industryProfile?: IndustryProfile | null;
  seniorityBand?: SeniorityBand | null;
  companyId: string;
  createdAt: string;
}

/** Legacy listing DTO (snake_case) for transition from JobListing table. */
export interface JobListing {
  id: string;
  job_title: string;
  company_name: string;
  company_logo?: string | null;
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string | null;
  tech_stack: string[];
  category: string;
  is_featured: boolean;
  posted_at: string;
  requirements?: string;
  existingScore: { score: number; label: string | null } | null;
}

export interface JobWithScore extends Job {
  atsScore?: Pick<JobAtsScore, "id" | "finalScore" | "scoreLabel">;
}
