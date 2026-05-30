import type { JobListing } from "@prisma/client";
import { DealBreakerDetector } from "@/scoring/dealbreaker";
import { computeAllComponents } from "@/scoring/engine";
import { adjustWeightsWithFeedback } from "@/scoring/engine/FeedbackWeightAdjuster";
import { computeFinalScore } from "@/scoring/engine/FinalScoreComputer";
import { selectIndustryWeights } from "@/scoring/engine/IndustryWeightSelector";
import { jobSchemaFromListing } from "@/scoring/jd-heuristic";
import {
  scoreToGrade,
  scoreToRecommendation,
} from "@/models/scoring.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import { buildScoreBreakdown } from "@/scoring/v3/build-breakdown";
import { resolveIndustry } from "@/scoring/v3/industry-weights";
import type { JobScoreResult } from "@/scoring/types";

export type EphemeralScoreOptions = {
  tenantId: string;
  candidateId: string;
  resumeVersionId?: string;
  parseConfidence?: number;
  currentYear?: number;
};

export async function scoreEphemeralForListing(
  resume: ResumeSchemaType,
  listing: JobListing,
  options: EphemeralScoreOptions
): Promise<JobScoreResult> {
  const job = jobSchemaFromListing(listing);
  const industry = resolveIndustry(job.industryDomain, resume.industryDomain);
  const weightSelection = selectIndustryWeights({
    jobIndustry: job.industryDomain,
    resumeIndustry: resume.industryDomain,
  });
  const weights = adjustWeightsWithFeedback(
    weightSelection.weights,
    weightSelection.industryProfile,
    null
  );

  const ctx = {
    resume,
    job,
    candidateId: options.candidateId,
    tenantId: options.tenantId,
    resumeVersionId: options.resumeVersionId ?? listing.id,
    parseConfidence: options.parseConfidence ?? resume.parseConfidence,
    currentYear: options.currentYear ?? new Date().getFullYear(),
  };

  const { components, details } = await computeAllComponents(ctx);
  const skillScoreReliable = details.skill.skillScoreReliable !== false;
  const deal = DealBreakerDetector.check(resume, job);
  const finalResult = computeFinalScore(components, weights, {
    resumeVersionId: ctx.resumeVersionId,
    jobId: listing.id,
    resume,
    parseConfidence: ctx.parseConfidence,
    calibrationSampleSize: 0,
    applyDealbreakerCap: deal.capScore,
  });

  const matchedSkills = details.skill.matched ?? [];
  const missingSkills = details.skill.missing ?? [];
  const flags: string[] = [];
  if (finalResult.requiresManualReview) flags.push("LOW_CONFIDENCE");
  if (!skillScoreReliable) flags.push("SKILL_MATCH_UNRELIABLE");
  if (deal.capScore) flags.push("DEALBREAKER_CAP_APPLIED");

  return {
    overallScore: finalResult.overallScore,
    grade: scoreToGrade(finalResult.overallScore),
    recommendation: scoreToRecommendation(finalResult.overallScore, deal.triggered),
    scoreBreakdown: buildScoreBreakdown(components, weights, {}),
    dealbreakers: deal.triggered,
    flags,
    topStrengths: matchedSkills.slice(0, 3),
    topGaps: missingSkills.slice(0, 3),
    matchedSkills,
    missingSkills,
    reasons: [details.skill.reason, details.experience.reason].filter(Boolean),
    scoreConfidence: finalResult.scoreConfidence,
    requiresManualReview: finalResult.requiresManualReview,
    industryDomain: industry,
    pipeline: "ats-v3-ephemeral",
    skillScoreReliable,
    dealbreakerCapApplied: deal.capScore,
  };
}
