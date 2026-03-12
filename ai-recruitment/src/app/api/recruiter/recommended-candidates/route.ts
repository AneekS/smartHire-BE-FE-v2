import { NextResponse } from "next/server";
import { withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { RecruiterRecommendationsQuerySchema } from "@/lib/validators/job.schema";
import { JobRecommendationService } from "@/services/recommendations/job-recommendation.service";

const service = new JobRecommendationService();

export async function GET(req: AuthenticatedRequest) {
  return withRole(req, "RECRUITER", async (authedReq) => {
    try {
      const { searchParams } = new URL(authedReq.url);
      const parsed = RecruiterRecommendationsQuerySchema.parse(Object.fromEntries(searchParams.entries()));

      const candidates = await service.getRecruiterCandidateMatches({
        jobId: parsed.jobId,
        limit: parsed.limit,
      });

      return NextResponse.json({ candidates });
    } catch (error) {
      return handleError(error);
    }
  });
}
