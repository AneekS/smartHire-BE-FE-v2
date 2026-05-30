import { prisma } from "@/lib/db";
import { ensureJobFromListing } from "@/lib/job-listing-job-bridge";
import { ensureResumeV2Bridge } from "@/lib/resume-v2-bridge";
import {
  scoreLabelFromRecommendation,
  scoreToGrade,
  scoreToRecommendation,
} from "@/models/scoring.schema";
import { ATSEngine } from "@/scoring/ATSEngine";
import type { AtsComputeResult } from "@/scoring/ATSEngine.types";
import { buildScoreBreakdown } from "@/scoring/v3/build-breakdown";
import { getIndustryWeights } from "@/scoring/v3/industry-weights";
import type { JobScoreResult } from "@/scoring/v3/types";
import { AtsEngineV3 } from "@/scoring/v3/ats-engine";
import { syncApplicationAiScore } from "@/services/applications/application-ats-sync";

/** Bump when scoring/dealbreaker logic changes so cached job_ats_scores are recomputed. */
const JOB_ATS_SCORE_VERSION = "2026-05-30-dealbreaker-v2";

export function mapJobScoreToListingResponse(
  result: JobScoreResult,
  meta: {
    jobTitle: string;
    companyName: string;
    resumeVersionId: string;
    listingId: string | null;
  }
) {
  const scoreLabel = scoreLabelFromRecommendation(result.recommendation);
  return {
    overallScore: result.overallScore,
    grade: result.grade,
    recommendation: result.recommendation,
    scoreBreakdown: result.scoreBreakdown,
    breakdown: result.scoreBreakdown,
    matchedSkills: result.matchedSkills,
    missingSkills: result.missingSkills,
    dealbreakers: result.dealbreakers,
    flags: result.flags,
    topStrengths: result.topStrengths,
    topGaps: result.topGaps,
    matchSummary: result.explanation ?? null,
    recommendations: result.reasons,
    scoreLabel,
    scoreConfidence: result.scoreConfidence,
    requiresManualReview: result.requiresManualReview,
    industryDomain: result.industryDomain,
    pipeline: result.pipeline ?? "ats-v3",
    jobTitle: meta.jobTitle,
    companyName: meta.companyName || null,
    resumeId: meta.resumeVersionId,
    keywordAnalysis: {
      matched: result.matchedSkills,
      missing: result.missingSkills,
    },
    jobListingId: meta.listingId,
    skillScoreReliable: result.skillScoreReliable,
    percentileRank: result.percentileRank,
    dealbreakerCapApplied: result.dealbreakerCapApplied,
    applicationAtsScoreId: null as string | null,
    scoreEngineVersion: JOB_ATS_SCORE_VERSION,
  };
}

export function mapPersistedAtsToListingResponse(
  row: AtsComputeResult,
  meta: {
    jobTitle: string;
    companyName: string;
    resumeVersionId: string;
    listingId: string | null;
  }
) {
  const components = {
    semanticMatch: row.semanticScore,
    skillMatch: row.skillScore,
    experienceMatch: row.experienceScore,
    atsCompliance: row.complianceScore,
    projectRelevance: row.projectScore,
    educationMatch: row.educationScore,
    resumeQuality: row.qualityScore,
  };
  const industry = row.industryProfile;
  const weights = getIndustryWeights(industry);
  const overallScore = Math.round(row.finalScore);
  const dealbreakers = row.dealbreakers ?? [];
  const matchedSkills = (row.careerReadiness?.strengthAreas as string[]) ?? [];
  const missingSkills = row.skillGaps.map((g) => g.missingSkill);
  const flags: string[] = [];
  if (row.requiresManualReview) flags.push("LOW_CONFIDENCE");
  if (row.skillScoreReliable === false) flags.push("SKILL_MATCH_UNRELIABLE");
  if (row.dealbreakerCapApplied) flags.push("DEALBREAKER_CAP_APPLIED");

  const recommendation = scoreToRecommendation(overallScore, dealbreakers);
  const scoreBreakdown = buildScoreBreakdown(components, weights, {});

  return {
    overallScore,
    grade: scoreToGrade(overallScore),
    recommendation,
    scoreBreakdown,
    breakdown: scoreBreakdown,
    matchedSkills,
    missingSkills,
    dealbreakers,
    flags,
    topStrengths: matchedSkills.slice(0, 3),
    topGaps: missingSkills.slice(0, 3),
    matchSummary: null,
    recommendations: (row.careerReadiness?.developmentAreas as string[]) ?? [],
    scoreLabel: scoreLabelFromRecommendation(recommendation),
    scoreConfidence: row.confidence,
    requiresManualReview: row.requiresManualReview,
    industryDomain: industry,
    pipeline: "ats-v3-persisted",
    jobTitle: meta.jobTitle,
    companyName: meta.companyName || null,
    resumeId: meta.resumeVersionId,
    keywordAnalysis: { matched: matchedSkills, missing: missingSkills },
    jobListingId: meta.listingId,
    skillScoreReliable: row.skillScoreReliable,
    percentileRank: row.percentileRank,
    dealbreakerCapApplied: row.dealbreakerCapApplied,
    applicationAtsScoreId: row.id,
    scoreEngineVersion: JOB_ATS_SCORE_VERSION,
  };
}

export function mapJobAtsScoreRow(row: {
  id: string;
  listingId: string;
  score: number;
  details: unknown;
  createdAt: Date;
}) {
  const d = (row.details ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    jobTitle: d.jobTitle ?? null,
    companyName: d.companyName ?? null,
    jobListingId: row.listingId,
    overallScore: row.score,
    grade: d.grade ?? null,
    recommendation: d.recommendation ?? null,
    scoreLabel: d.scoreLabel ?? "Match",
    matchSummary: d.matchSummary ?? null,
    scoreBreakdown: d.scoreBreakdown ?? d.breakdown ?? null,
    breakdown: d.scoreBreakdown ?? d.breakdown ?? null,
    flags: d.flags ?? [],
    topStrengths: d.topStrengths ?? [],
    topGaps: d.topGaps ?? [],
    dealbreakers: d.dealbreakers ?? [],
    keywordAnalysis: d.keywordAnalysis ?? null,
    sectionScores: d.sectionScores ?? null,
    recommendations: d.recommendations ?? null,
    competitiveAnalysis: d.competitiveAnalysis ?? null,
    tailoredSummary: d.tailoredSummary ?? null,
    topMissingKeywordsToAdd: d.topMissingKeywordsToAdd ?? [],
    scoreConfidence: d.scoreConfidence ?? null,
    requiresManualReview: d.requiresManualReview ?? false,
    industryDomain: d.industryDomain ?? null,
    pipeline: d.pipeline ?? null,
    skillScoreReliable: d.skillScoreReliable ?? true,
    percentileRank: d.percentileRank ?? undefined,
    dealbreakerCapApplied: d.dealbreakerCapApplied ?? false,
    applicationAtsScoreId: d.applicationAtsScoreId ?? null,
    createdAt: row.createdAt,
  };
}

export async function scoreJobListingForUser(input: {
  userId: string;
  tenantId: string;
  candidateId: string;
  listingId: string;
}) {
  const listing = await prisma.jobListing.findFirst({
    where: { id: input.listingId, isActive: true },
  });
  if (!listing) {
    throw new Error("Job listing not found");
  }

  const jobDescription = [
    listing.description,
    listing.requirements,
    listing.responsibilities,
    listing.niceToHave,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!jobDescription.trim() || jobDescription.trim().length < 100) {
    throw new Error(
      "Job description is too short. Paste the full JD for accurate scoring."
    );
  }

  const latestResume = await prisma.resumeVersion.findFirst({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
  });

  if (!latestResume) {
    throw new Error(
      "No resume found. Please upload your resume in Resume Optimizer first."
    );
  }

  if (latestResume.tenantId !== input.tenantId) {
    await prisma.resumeVersion.update({
      where: { id: latestResume.id },
      data: { tenantId: input.tenantId },
    });
  }

  const parsedRow = await prisma.parsedResume.findUnique({
    where: { resumeVersionId: latestResume.id },
  });

  if (!parsedRow?.parsedData) {
    throw new Error(
      "Resume not yet parsed. Please re-upload your resume in Resume Optimizer."
    );
  }

  const cached = await prisma.jobAtsScore.findUnique({
    where: {
      candidateId_listingId: {
        candidateId: input.candidateId,
        listingId: input.listingId,
      },
    },
  });

  const cachedDetails = (cached?.details ?? {}) as Record<string, unknown>;
  const cachedResumeId = cachedDetails.resumeId as string | undefined;
  const cachedPipeline = cachedDetails.pipeline as string | undefined;
  const cachedScoreVersion = cachedDetails.scoreEngineVersion as string | undefined;
  if (
    cached &&
    cachedResumeId === latestResume.id &&
    cachedPipeline === "ats-v3-persisted" &&
    cachedScoreVersion === JOB_ATS_SCORE_VERSION
  ) {
    const cachedOverall = Number(
      (cachedDetails.overallScore as number | undefined) ?? cached.score
    );
    void syncApplicationAiScore(
      input.candidateId,
      input.listingId,
      cachedOverall
    ).catch((err) =>
      console.warn("[job-listing-ats] application aiScore sync failed:", err)
    );

    return {
      payload: { ...mapJobAtsScoreRow(cached), cached: true },
      savedId: cached.id,
      resumeVersionId: latestResume.id,
      fromCache: true,
    };
  }

  const v2Id = await ensureResumeV2Bridge({
    legacyResumeVersionId: latestResume.id,
    candidateId: input.candidateId,
    tenantId: input.tenantId,
  });

  await ensureJobFromListing(listing, input.tenantId, input.candidateId);

  let responsePayload: Record<string, unknown>;

  try {
    const persisted = await ATSEngine.compute(
      v2Id,
      listing.id,
      input.tenantId,
      { listingId: listing.id }
    );
    responsePayload = mapPersistedAtsToListingResponse(persisted, {
      jobTitle: listing.title,
      companyName: listing.companyName,
      resumeVersionId: latestResume.id,
      listingId: input.listingId,
    });
  } catch (engineError) {
    console.warn(
      "[job-listing-ats] ATSEngine.compute failed, ephemeral fallback:",
      engineError
    );
    const { parseResumeSchema } = await import("@/models/resume.schema");
    const resume = parseResumeSchema(parsedRow.parsedData);
    const skipNarrative =
      process.env.SCORING_FALLBACK_LLM !== "true" &&
      process.env.SCORING_FALLBACK_LLM !== "1";
    const ephemeral = await AtsEngineV3.scoreForJobListing(
      resume,
      listing,
      input.candidateId,
      {
        tenantId: input.tenantId,
        resumeVersionId: latestResume.id,
        parseConfidence: parsedRow.parseConfidence ?? resume.parseConfidence,
        skipNarrative,
      }
    );
    responsePayload = mapJobScoreToListingResponse(ephemeral, {
      jobTitle: listing.title,
      companyName: listing.companyName,
      resumeVersionId: latestResume.id,
      listingId: input.listingId,
    });
  }

  const details = JSON.parse(JSON.stringify(responsePayload));

  const saved = await prisma.jobAtsScore.upsert({
    where: {
      candidateId_listingId: {
        candidateId: input.candidateId,
        listingId: input.listingId,
      },
    },
    create: {
      candidateId: input.candidateId,
      listingId: input.listingId,
      score: Number(responsePayload.overallScore),
      details,
    },
    update: {
      score: Number(responsePayload.overallScore),
      details,
    },
    select: { id: true },
  });

  void syncApplicationAiScore(
    input.candidateId,
    input.listingId,
    Number(responsePayload.overallScore)
  ).catch((err) =>
    console.warn("[job-listing-ats] application aiScore sync failed:", err)
  );

  return {
    payload: {
      id: saved.id,
      ...responsePayload,
      cached: false,
      resumeFileName: latestResume.title,
    },
    savedId: saved.id,
    resumeVersionId: latestResume.id,
    fromCache: false,
  };
}
