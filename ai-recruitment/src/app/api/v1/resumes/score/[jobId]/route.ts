import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { ScorerService } from "@/services/resume/scorer.service";
import { OptimizerService } from "@/services/resume/optimizer.service";
import {
  checkRateLimit,
  getScoreLimit,
  scoreRateLimitKey,
} from "@/lib/rate-limit";
import { logExtractionEvent } from "@/monitoring/logger";

const scorer = new ScorerService();
const optimizer = new OptimizerService();

export async function GET(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(req, async (authedReq) => {
    const scoreStarted = Date.now();
    const userId = authedReq.user!.id;

    const rateLimit = await checkRateLimit(
      scoreRateLimitKey(userId),
      getScoreLimit(),
      3600
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Scoring rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec) },
        }
      );
    }

    const candidateId = authedReq.user!.candidateId ?? userId;
    const { jobId } = await params;

    const activeResume = await prisma.resumeVersion.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        parsedResume: { isNot: null },
      },
      select: { id: true, tenantId: true },
      orderBy: { createdAt: "desc" },
    });

    if (!activeResume) {
      return NextResponse.json(
        { error: "No parsed resume found" },
        { status: 404 }
      );
    }

    const result = await scorer.computeJobScore(
      activeResume.id,
      candidateId,
      jobId
    );

    const suggestions = await optimizer.generateSuggestions(
      activeResume.id,
      candidateId,
      jobId
    );

    logExtractionEvent({
      event: "scoring_complete",
      resume_id: activeResume.id,
      tenant_id: activeResume.tenantId ?? candidateId,
      pass_number: null,
      duration_ms: Date.now() - scoreStarted,
      confidence: null,
      field_count: null,
      error: null,
    });

    return NextResponse.json({ ...result, suggestions });
  });
}
