import { NextResponse } from "next/server";

import { withRecruiterAccess } from "@/auth/RBACGuard";

import { RecruiterAccessGuard } from "@/auth/RecruiterAccessGuard";

import { addTenantFilter } from "@/auth/TenantIsolation";

import { ForbiddenError } from "@/auth/errors";

import type { AuthenticatedRequest } from "@/lib/auth-middleware";

import { handleError } from "@/lib/errors";

import { RecruiterRecommendationsQuerySchema } from "@/lib/validators/job.schema";

import { JobRecommendationService } from "@/services/recommendations/job-recommendation.service";

import { prisma } from "@/lib/db";



const service = new JobRecommendationService();



export async function GET(req: AuthenticatedRequest) {

  return withRecruiterAccess(req, async (authedReq) => {

    try {

      const tenantId = authedReq.tenantId!;

      const { searchParams } = new URL(authedReq.url);

      const parsed = RecruiterRecommendationsQuerySchema.parse(

        Object.fromEntries(searchParams.entries())

      );



      await RecruiterAccessGuard.assertJobAccess(

        authedReq.user!.id,

        parsed.jobId,

        tenantId

      );



      const page = parseInt(searchParams.get("page") ?? "1", 10);

      const limit = parsed.limit;



      const candidates = await service.getRecruiterCandidateMatches({

        jobId: parsed.jobId,

        limit: limit * page,

      });



      const jobScores = await prisma.applicationAtsScore.findMany({

        where: addTenantFilter({ jobId: parsed.jobId }, tenantId),

        orderBy: { computedAt: "desc" },

        include: {

          resumeVersion: {

            select: {

              resume: { select: { candidateId: true } },

            },

          },

        },

        take: 500,

      });



      const scoreByCandidate = new Map<string, number>();

      for (const row of jobScores) {

        const candidateId = row.resumeVersion?.resume?.candidateId;

        if (candidateId && !scoreByCandidate.has(candidateId)) {

          scoreByCandidate.set(candidateId, row.finalScore);

        }

      }



      const enriched = candidates.map((c) => ({

        ...c,

        latestAtsScore: scoreByCandidate.get(c.candidateId) ?? null,

      }));



      const start = (page - 1) * limit;

      const pageItems = enriched.slice(start, start + limit);



      return NextResponse.json({

        data: pageItems,

        meta: { page, limit, total: enriched.length },

      });

    } catch (error) {

      if (error instanceof ForbiddenError) {

        return NextResponse.json({ error: error.message }, { status: 403 });

      }

      return handleError(error);

    }

  });

}


