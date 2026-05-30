import type { ScoreComponentKey } from "@/models/scoring.schema";
import type { IndustryProfile, SeniorityBand } from "@prisma/client";

export type { ScoreComponentKey };

export interface AtsBreakdownComponent {
  score: number;
  weight: number;
  contribution: number;
  reason: string;
  matched?: string[];
  missing?: string[];
  bonus?: string[];
}

export type AtsBreakdown = Partial<Record<ScoreComponentKey, AtsBreakdownComponent>>;

export interface SkillGap {
  missingSkill: string;
  importance: number;
  canonicalSkill?: string | null;
}

export interface JobAtsScore {
  id: string;
  jobId?: string;
  jobListingId?: string | null;
  resumeVersionId?: string | null;
  finalScore: number;
  confidence: number;
  requiresManualReview: boolean;
  skillScoreReliable?: boolean;
  percentileRank?: number;
  industryProfile: IndustryProfile | string;
  seniorityBand?: SeniorityBand | string | null;
  breakdown?: AtsBreakdown;
  scoreBreakdown?: AtsBreakdown;
  skillGaps: SkillGap[];
  matchedSkills: string[];
  missingSkills: string[];
  grade?: string;
  recommendation?: string;
  scoreLabel?: string;
  matchSummary?: string | null;
  computedAt: string;
  pipeline?: string;
  flags?: string[];
  cached?: boolean;
  /** Legacy/extra API fields during transition */
  [key: string]: unknown;
}

export interface ChartDataPoint {
  name: string;
  score: number;
  weight: number;
  fill?: string;
}
