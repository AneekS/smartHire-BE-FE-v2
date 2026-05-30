export interface Candidate {
  id: string;
  name: string;
  headline?: string | null;
  location?: string | null;
  profileCompleteness: number;
  skills: string[];
  experience?: number | null;
}

export interface CandidateProfile {
  id: string;
  candidateId: string;
  bio?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
}

export interface CandidateAnalytics {
  profileViews?: number;
  applicationCount?: number;
  matchRate?: number;
}
