import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import {
  withAuth,
  type AuthenticatedRequest,
} from "@/lib/auth-middleware";
import {
  checkRateLimit,
  getScoreLimit,
  scoreRateLimitKey,
} from "@/lib/rate-limit";
import { logExtractionEvent } from "@/monitoring/logger";
import {
  mapJobAtsScoreRow,
  scoreJobListingForUser,
} from "@/services/ats/job-listing-ats.service";

export const maxDuration = 120;

function logScoringComplete(
  resumeId: string,
  tenantId: string | null,
  startedMs: number
) {
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

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const scoreStarted = Date.now();
    try {
      const userId = authedReq.user!.id;
      const tenantId = authedReq.tenantId!;

      const rateLimit = await checkRateLimit(
        scoreRateLimitKey(tenantId),
        getScoreLimit(),
        3600
      );
      if (!rateLimit.allowed) {
        return err("Scoring rate limit exceeded", 429);
      }

      const body = await req.json().catch(() => ({}));
      const jobListingIdRaw = body?.job_listing_id ?? body?.jobListingId;

      const listingId =
        typeof jobListingIdRaw === "string" && jobListingIdRaw.trim()
          ? jobListingIdRaw.trim()
          : null;

      if (!listingId) {
        return err("job_listing_id is required", 400);
      }

      const candidate = await prisma.candidate.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!candidate) {
        return err("Candidate profile not found", 404);
      }

      const { payload, resumeVersionId } = await scoreJobListingForUser({
        userId,
        tenantId,
        candidateId: candidate.id,
        listingId,
      });

      logScoringComplete(resumeVersionId, tenantId, scoreStarted);
      return ok(payload, payload.cached ? 200 : 201);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Scoring failed. Please try again.";
      console.error("[job-ats] POST error:", msg, error);
      if (msg.includes("not found")) {
        return err(msg, 404);
      }
      if (msg.includes("No resume") || msg.includes("not yet parsed")) {
        return err(msg, 404);
      }
      if (msg.includes("too short") || msg.includes("required")) {
        return err(msg, 400);
      }
      return err(
        msg.includes("timeout")
          ? "Scoring timed out. Ensure resume is parsed and try again."
          : msg,
        500
      );
    }
  });
}

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const userId = authedReq.user!.id;

      const rateLimit = await checkRateLimit(
        scoreRateLimitKey(tenantId),
        getScoreLimit(),
        3600
      );
      if (!rateLimit.allowed) {
        return err("Scoring rate limit exceeded", 429);
      }

      const jobListingId = new URL(authedReq.url).searchParams.get(
        "job_listing_id"
      );

      const candidate = await prisma.candidate.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!candidate) {
        return err("Candidate profile not found", 404);
      }

      if (jobListingId?.trim()) {
        const score = await prisma.jobAtsScore.findUnique({
          where: {
            candidateId_listingId: {
              candidateId: candidate.id,
              listingId: jobListingId.trim(),
            },
          },
        });

        if (!score) {
          return err("Score not found", 404);
        }

        const row = mapJobAtsScoreRow(score);
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
      const msg =
        error instanceof Error ? error.message : "Fetch failed. Please try again.";
      console.error("[job-ats] GET error:", msg, error);
      return err(msg, 500);
    }
  });
}
