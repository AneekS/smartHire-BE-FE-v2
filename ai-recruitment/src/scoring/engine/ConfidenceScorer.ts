import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail, ScoringContext } from "@/scoring/types";

export function computeScoreConfidence(
  resume: ResumeSchemaType,
  parseConfidence?: number
): { scoreConfidence: number; fieldCompleteness: number } {
  const fields = [
    Boolean(resume.fullName?.trim()),
    Boolean(resume.email?.trim() || resume.phone?.trim()),
    Boolean(resume.summary?.trim()),
    resume.skills.length >= 3,
    resume.experience.length >= 1,
    resume.education.length >= 1,
  ];
  const fieldCompleteness = fields.filter(Boolean).length / fields.length;

  const parse = parseConfidence ?? resume.parseConfidence;
  const scoreConfidence =
    parse != null
      ? Math.max(0, Math.min(1, parse * 0.7 + fieldCompleteness * 0.3))
      : Math.max(0, Math.min(1, 0.75 + fieldCompleteness * 0.25));

  return { scoreConfidence, fieldCompleteness };
}

export function scoreConfidenceComponent(ctx: ScoringContext): ComponentDetail {
  const { scoreConfidence, fieldCompleteness } = computeScoreConfidence(
    ctx.resume,
    ctx.parseConfidence
  );
  return {
    score: Math.round(scoreConfidence * 100),
    reason: `Parse confidence and field completeness: ${Math.round(fieldCompleteness * 100)}%`,
  };
}
