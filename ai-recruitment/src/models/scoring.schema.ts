import { z } from "zod";

export const ScoreComponentKeySchema = z.enum([
  "semanticMatch",
  "skillMatch",
  "experienceMatch",
  "seniorityBand",
  "educationMatch",
  "achievementScore",
]);

export type ScoreComponentKey = z.infer<typeof ScoreComponentKeySchema>;

export const ScoreComponentBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100),
  contribution: z.number(),
  reason: z.string(),
  matched: z.array(z.string()).optional(),
  missing: z.array(z.string()).optional(),
  bonus: z.array(z.string()).optional(),
});

export const ScoreBreakdownSchema = z.record(
  ScoreComponentKeySchema,
  ScoreComponentBreakdownSchema
);

export const RecommendationSchema = z.enum([
  "STRONG_CONSIDER",
  "CONSIDER",
  "REVIEW",
  "REJECT",
]);

export const GradeSchema = z.enum([
  "A+",
  "A",
  "B+",
  "B",
  "C",
  "D",
  "F",
]);

/** Legacy flat breakdown kept for parse-stage base ATS score. */
export const LegacyScoreBreakdownSchema = z.object({
  keywordMatch: z.number(),
  formatting: z.number(),
  experienceMatch: z.number(),
  skillsAlignment: z.number(),
  semanticMatch: z.number().optional(),
});

export const ScoreResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: GradeSchema,
  recommendation: RecommendationSchema,
  scoreBreakdown: ScoreBreakdownSchema,
  dealbreakers: z.array(z.string()).default([]),
  flags: z.array(z.string()).default([]),
  topStrengths: z.array(z.string()).default([]),
  topGaps: z.array(z.string()).default([]),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  explanation: z.string().optional(),
  reasons: z.array(z.string()).default([]),
  /** @deprecated use scoreBreakdown */
  breakdown: LegacyScoreBreakdownSchema.optional(),
});

export type ScoreResult = z.infer<typeof ScoreResultSchema>;
export type ScoreComponentBreakdown = z.infer<typeof ScoreComponentBreakdownSchema>;
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type Grade = z.infer<typeof GradeSchema>;
export type LegacyScoreBreakdown = z.infer<typeof LegacyScoreBreakdownSchema>;

export function scoreToGrade(score: number): Grade {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function scoreToRecommendation(
  score: number,
  dealbreakers: string[]
): Recommendation {
  if (dealbreakers.length > 0) return "REJECT";
  if (score >= 80) return "STRONG_CONSIDER";
  if (score >= 65) return "CONSIDER";
  if (score >= 45) return "REVIEW";
  return "REJECT";
}

export function scoreLabelFromRecommendation(rec: Recommendation): string {
  switch (rec) {
    case "STRONG_CONSIDER":
      return "Strong Match";
    case "CONSIDER":
      return "Good Match";
    case "REVIEW":
      return "Needs Review";
    case "REJECT":
      return "Not a Match";
  }
}
