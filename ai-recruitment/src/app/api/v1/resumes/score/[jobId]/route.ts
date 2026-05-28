import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { OptimizerService } from "@/services/resume/optimizer.service";
import { parseResumeSchema } from "@/models/resume.schema";
import { resolveJobSchema } from "@/scoring/jd-parser";
import { AtsEngineV3 } from "@/scoring/v3/ats-engine";
import {
  checkRateLimit,
  getScoreLimit,
  scoreRateLimitKey,
} from "@/lib/rate-limit";
import { logExtractionEvent } from "@/monitoring/logger";

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

    const [parsedRow, listing, legacyJob] = await Promise.all([
      prisma.parsedResume.findUnique({
        where: { resumeVersionId: activeResume.id },
      }),
      prisma.jobListing.findFirst({
        where: { id: jobId, isActive: true },
      }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);

    if (!parsedRow?.parsedData) {
      return NextResponse.json({ error: "Parsed resume not found" }, { status: 404 });
    }

    let jdText: string;
    let jobTitle: string;
    let companyName = "";

    if (listing) {
      jobTitle = listing.title;
      companyName = listing.companyName;
      jdText = [
        listing.description,
        listing.requirements,
        listing.responsibilities,
        listing.niceToHave,
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (legacyJob) {
      jobTitle = legacyJob.title;
      jdText = `${legacyJob.description}\n${legacyJob.requirements ?? ""}`;
    } else {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const resume = parseResumeSchema(parsedRow.parsedData);
    const job = await resolveJobSchema({
      jobId,
      jdText,
      jobTitle,
      companyName,
      strategy: "heuristic",
    });

    const result = await AtsEngineV3.scoreForJob(resume, job, candidateId, {
      tenantId: activeResume.tenantId ?? undefined,
      parseConfidence: parsedRow.parseConfidence ?? resume.parseConfidence,
      skipNarrative: true,
    });

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

    return NextResponse.json({
      score: result.overallScore,
      matched: result.matchedSkills,
      missing: result.missingSkills,
      grade: result.grade,
      recommendation: result.recommendation,
      scoreBreakdown: result.scoreBreakdown,
      dealbreakers: result.dealbreakers,
      pipeline: result.pipeline,
      suggestions,
    });
  });
}
