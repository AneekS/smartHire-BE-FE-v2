import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { BehaviorEventSchema } from "@/lib/validators/job.schema";
import { JobRecommendationService } from "@/services/recommendations/job-recommendation.service";

const service = new JobRecommendationService();

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body = await req.json();
      const parsed = BehaviorEventSchema.parse(body);

      const event = await service.trackBehaviorEvent({
        candidateId: authedReq.user?.candidateId,
        email: authedReq.user?.email,
        jobId: parsed.jobId,
        eventType: parsed.eventType,
        metadata: parsed.metadata,
      });

      return NextResponse.json({ event }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
