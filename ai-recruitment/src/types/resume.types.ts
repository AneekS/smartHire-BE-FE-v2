export type ResumeVersionStatus = "DRAFT" | "ACTIVE";

export type PipelineStatus =
  | "QUEUED"
  | "PREPROCESSING"
  | "PARSING"
  | "PARSED"
  | "EMBEDDING"
  | "EMBEDDED"
  | "SCORED"
  | "COMPLETE"
  | "FAILED";

export interface ParsedExperienceSummary {
  title?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
}

export interface ParsedEducationSummary {
  degree?: string;
  institution?: string;
  year?: string;
}

/** Client-safe parsed resume — no PII or raw parsedData blob. */
export interface ParsedResumeSummary {
  skills: string[];
  experience: ParsedExperienceSummary[];
  education: ParsedEducationSummary[];
  summary?: string;
}

export interface ResumeVersion {
  id: string;
  title: string;
  status: ResumeVersionStatus;
  pipelineStatus: PipelineStatus;
  atsScore?: number | null;
  fileUrl?: string | null;
  updatedAt: string;
}

export interface Resume {
  id?: string;
  activeVersionId?: string | null;
  versions: ResumeVersion[];
}
