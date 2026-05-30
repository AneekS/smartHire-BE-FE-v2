import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { AtsGenerateSchema } from "@/lib/validators/ats.schema";
import { ATSScoringService } from "@/services/ATSScoringService";
import { prisma } from "@/lib/db";
import { RateLimiter } from "@/security/RateLimiter";

export const maxDuration = 120;

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;

      const rateLimit = await RateLimiter.atsLimit(tenantId);
      if (!rateLimit.allowed) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        );
        return NextResponse.json(
          { error: "Scoring rate limit exceeded" },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfterSec) },
          }
        );
      }

      const body = AtsGenerateSchema.safeParse(await req.json());
      if (!body.success) {
        return NextResponse.json(
          { error: body.error.flatten() },
          { status: 400 }
        );
      }

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { id: authedReq.user?.candidateId },
            { userId: authedReq.user!.id },
          ],
        },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const score = await ATSScoringService.score({
        resumeVersionId: body.data.resumeVersionId,
        jobId: body.data.jobId,
        tenantId,
        candidateId: candidate.id,
        userId: authedReq.user!.id,
      });

      return NextResponse.json({ data: score }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
