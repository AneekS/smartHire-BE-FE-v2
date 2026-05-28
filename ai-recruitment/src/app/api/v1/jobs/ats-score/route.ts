import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { parseResumeSchema } from "@/models/resume.schema";
import { resolveJobSchema } from "@/scoring/jd-parser";
import { AtsEngineV3 } from "@/scoring/v3/ats-engine";
import { scoreLabelFromRecommendation } from "@/models/scoring.schema";
import type { ScoreResult } from "@/models/scoring.schema";
import type { JobScoreResult } from "@/scoring/v3/types";
import {
  checkRateLimit,
  getScoreLimit,
  scoreRateLimitKey,
} from "@/lib/rate-limit";
import { logExtractionEvent } from "@/monitoring/logger";

export const maxDuration = 120;

function logScoringComplete(resumeId: string, tenantId: string | null, startedMs: number) {
  logExtractionEvent({
    event: "scoring_complete",
    resume_id: resumeId,
    tenant_id: tenantId,
    pass_number: null,
    duration_ms: Date.now() - startedMs,
    confidence: null,
    field_count: null,
    error: null,
  });
}

function mapScoreResultToResponse(
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
  };
}

export async function POST(req: NextRequest) {
  const scoreStarted = Date.now();
  try {
    const { dbUser } = await withAuth(req);

    const rateLimit = await checkRateLimit(
      scoreRateLimitKey(dbUser.id),
      getScoreLimit(),
      3600
    );
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: "Scoring rate limit exceeded" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        }
      );
    }

    const body = await req.json();
    const {
      job_listing_id: jobListingIdRaw,
      jobTitle: bodyTitle,
      companyName: bodyCompany = "",
      jobDescription: bodyDescription,
    } = body ?? {};

    const candidate = await prisma.candidate.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    });

    let jobTitle = bodyTitle as string | undefined;
    let companyName = (bodyCompany as string) ?? "";
    let jobDescription = bodyDescription as string | undefined;
    let listingId: string | null =
      typeof jobListingIdRaw === "string" && jobListingIdRaw.trim()
        ? jobListingIdRaw.trim()
        : null;

    if (listingId) {
      const listing = await prisma.jobListing.findFirst({
        where: { id: listingId, isActive: true },
      });

      if (!listing) return err("Job listing not found", 404);

      jobTitle = listing.title;
      companyName = listing.companyName;
      jobDescription = [
        listing.description,
        listing.requirements,
        listing.responsibilities,
        listing.niceToHave,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (!jobTitle?.trim()) return err("jobTitle is required", 400);
    if (!jobDescription?.trim()) return err("jobDescription is required", 400);
    if (jobDescription.trim().length < 100) {
      return err(
        "Job description is too short. Paste the full JD for accurate scoring.",
        400
      );
    }

    const latestResume = await prisma.resumeVersion.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    if (!latestResume) {
      return err(
        "No resume found. Please upload your resume in Resume Optimizer first.",
        404
      );
    }

    const parsedRow = await prisma.parsedResume.findUnique({
      where: { resumeVersionId: latestResume.id },
    });

    if (!parsedRow?.parsedData) {
      return err(
        "Resume not yet parsed. Please re-upload your resume in Resume Optimizer.",
        404
      );
    }

    if (listingId && candidate) {
      const cached = await prisma.jobAtsScore.findUnique({
        where: {
          candidateId_listingId: {
            candidateId: candidate.id,
            listingId,
          },
        },
      });

      const cachedDetails = (cached?.details ?? {}) as Record<string, unknown>;
      const cachedResumeId = cachedDetails.resumeId as string | undefined;
      if (cached && cachedResumeId === latestResume.id) {
        return ok({ ...mapScoreRow(cached), cached: true });
      }
    }

    if (!candidate) {
      return err("Candidate profile not found", 404);
    }

    const resume = parseResumeSchema(parsedRow.parsedData);
    const job = await resolveJobSchema({
      jobId: listingId,
      jdText: jobDescription,
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      strategy: "heuristic",
    });

    const skipNarrative = process.env.SCORING_FALLBACK_LLM !== "true" &&
      process.env.SCORING_FALLBACK_LLM !== "1";

    const result = await AtsEngineV3.scoreForJob(resume, job, candidate.id, {
      tenantId: latestResume.tenantId ?? undefined,
      parseConfidence: parsedRow.parseConfidence ?? resume.parseConfidence,
      skipNarrative,
    });

    const responsePayload = mapScoreResultToResponse(result, {
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      resumeVersionId: latestResume.id,
      listingId,
    });

    const details = JSON.parse(JSON.stringify(responsePayload));

    let saved: { id: string } | null = null;
    if (listingId) {
      saved = await prisma.jobAtsScore.upsert({
        where: {
          candidateId_listingId: {
            candidateId: candidate.id,
            listingId,
          },
        },
        create: {
          candidateId: candidate.id,
          listingId,
          score: result.overallScore,
          details,
        },
        update: {
          score: result.overallScore,
          details,
        },
        select: { id: true },
      });
    }

    logScoringComplete(
      latestResume.id,
      latestResume.tenantId ?? candidate.id,
      scoreStarted
    );

    return ok({
      id: saved?.id,
      ...responsePayload,
      cached: false,
      resumeFileName: latestResume.title,
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg =
      error instanceof Error ? error.message : "Scoring failed. Please try again.";
    console.error("[job-ats] Route error:", msg, error);
    return err(
      msg.includes("timeout")
        ? "Scoring timed out. Ensure resume is parsed and try again."
        : msg,
      500
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { dbUser } = await withAuth(req);

    const rateLimit = await checkRateLimit(
      scoreRateLimitKey(dbUser.id),
      getScoreLimit(),
      3600
    );
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: "Scoring rate limit exceeded" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        }
      );
    }

    const jobListingId = new URL(req.url).searchParams.get("job_listing_id");

    const candidate = await prisma.candidate.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    });
    if (!candidate) return err("Candidate profile not found", 404);

    if (jobListingId?.trim()) {
      const score = await prisma.jobAtsScore.findUnique({
        where: {
          candidateId_listingId: {
            candidateId: candidate.id,
            listingId: jobListingId.trim(),
          },
        },
      });

      if (!score) return err("Score not found", 404);

      const row = mapScoreRow(score);
      const d = (score.details ?? {}) as Record<string, unknown>;
      let resumeFileName: string | undefined;
      if (typeof d.resumeId === "string") {
        const rv = await prisma.resumeVersion.findUnique({
          where: { id: d.resumeId },
          select: { title: true },
        });
        resumeFileName = rv?.title;
      }
      return ok({ ...row, resumeFileName });
    }

    const scores = await prisma.jobAtsScore.findMany({
      where: { candidateId: candidate.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped = scores.map((row) => {
      const d = (row.details ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        jobTitle: d.jobTitle ?? null,
        companyName: d.companyName ?? null,
        overallScore: row.score,
        scoreLabel: d.scoreLabel ?? null,
        matchSummary: d.matchSummary ?? null,
        createdAt: row.createdAt,
        jobListingId: row.listingId,
      };
    });
    return ok(mapped);
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg =
      error instanceof Error ? error.message : "Fetch failed. Please try again.";
    console.error("[job-ats] GET error:", msg, error);
    return err(msg, 500);
  }
}

function mapScoreRow(row: {
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
    createdAt: row.createdAt,
  };
}
