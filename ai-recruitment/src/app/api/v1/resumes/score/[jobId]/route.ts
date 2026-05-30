import { NextResponse } from "next/server";

import {

  withAuth,

  AuthenticatedRequest,

} from "@/lib/auth-middleware";

import { prisma } from "@/lib/db";

import { OptimizerService } from "@/services/resume/optimizer.service";

import { parseResumeSchema } from "@/models/resume.schema";

import { AtsEngineV3 } from "@/scoring/v3/ats-engine";

import { jobSchemaFromListing } from "@/scoring/jd-heuristic";
import { jobSchemaFromPrismaJob } from "@/scoring/job-schema-from-prisma";

import {

  checkRateLimit,

  getScoreLimit,

  scoreRateLimitKey,

} from "@/lib/rate-limit";

import { logExtractionEvent } from "@/monitoring/logger";



const optimizer = new OptimizerService();



async function resolveResumeVersionV2Id(

  legacyOrV2Id: string,

  tenantId: string | null

): Promise<string | null> {

  const direct = await prisma.resumeVersionV2.findFirst({

    where: { id: legacyOrV2Id, ...(tenantId ? { tenantId } : {}) },

    select: { id: true },

  });

  if (direct) return direct.id;



  const bridge = await prisma.resumeVersionV2.findFirst({

    where: {

      legacyResumeVersionId: legacyOrV2Id,

      ...(tenantId ? { tenantId } : {}),

    },

    select: { id: true },

  });

  if (bridge) return bridge.id;



  const legacy = await prisma.resumeVersion.findFirst({

    where: { id: legacyOrV2Id, ...(tenantId ? { tenantId } : {}) },

    include: { resumeVersionV2: { select: { id: true } } },

  });

  return legacy?.resumeVersionV2?.id ?? null;

}



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

    const tenantId = authedReq.tenantId ?? undefined;



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



    const resumeVersionV2Id = await resolveResumeVersionV2Id(

      activeResume.id,

      activeResume.tenantId

    );

    if (!resumeVersionV2Id) {

      return NextResponse.json(

        { error: "Resume version not bridged to v2" },

        { status: 404 }

      );

    }



    const [parsedRow, prismaJob, listing] = await Promise.all([

      prisma.parsedResume.findUnique({

        where: { resumeVersionId: activeResume.id },

      }),

      tenantId

        ? prisma.job.findFirst({
            where: { id: jobId, tenantId },
            include: { jobSkills: true },
          })

        : prisma.job.findUnique({
            where: { id: jobId },
            include: { jobSkills: true },
          }),

      prisma.jobListing.findFirst({

        where: { id: jobId, isActive: true },

      }),

    ]);



    if (!parsedRow?.parsedData) {

      return NextResponse.json({ error: "Parsed resume not found" }, { status: 404 });

    }



    if (!prismaJob && !listing) {

      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    }



    const resume = parseResumeSchema(parsedRow.parsedData);

    // Prisma Job wins when present — same priority as AtsEngineV3.scoreForJob.
    const job = prismaJob
      ? jobSchemaFromPrismaJob({
          id: prismaJob.id,
          title: prismaJob.title,
          description: prismaJob.description,
          requirements: prismaJob.requirements,
          requiredSkills: prismaJob.requiredSkills,
          industryProfile: prismaJob.industryProfile,
          experienceMin: prismaJob.experienceMin,
          experienceMax: prismaJob.experienceMax,
          seniorityBand: prismaJob.seniorityBand,
          jobSkills: prismaJob.jobSkills.map((s) => ({
            name: s.name,
            normalized: s.normalized,
            importance: s.importance,
          })),
        })
      : jobSchemaFromListing(listing!);



    const result = await AtsEngineV3.scoreForJob(resume, job, candidateId, {

      tenantId: tenantId ?? activeResume.tenantId ?? undefined,

      resumeVersionId: resumeVersionV2Id,

      jobId,

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

      flags: result.flags,

      skillScoreReliable: result.skillScoreReliable,

      percentileRank: result.percentileRank,

      pipeline: result.pipeline,

      suggestions,

    });

  });

}


