import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { BehaviorEventSchema } from "@/lib/validators/job.schema";
import { JobRecommendationService } from "@/services/recommendations/job-recommendation.service";
import { RoleIntelligenceService } from "@/services/role-intelligence/role-intelligence.service";
import { prisma } from "@/lib/db";

const service = new JobRecommendationService();
const roleService = new RoleIntelligenceService();

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

      const roleTriggerEventTypes = ["JOB_VIEW", "JOB_CLICK", "JOB_APPLICATION"] as const;
      type RoleTriggerEventType = typeof roleTriggerEventTypes[number];

      if (
        parsed.jobId &&
        (roleTriggerEventTypes as readonly string[]).includes(parsed.eventType)
      ) {
        const job = await prisma.job.findUnique({
          where: { id: parsed.jobId },
          select: { title: true },
        });
        if (job?.title) {
          await roleService.recordBehaviorSignal({
            email: authedReq.user?.email ?? "",
            roleHint: job.title,
            eventType: parsed.eventType as RoleTriggerEventType,
            durationSeconds:
              typeof parsed.metadata?.durationSeconds === "number"
                ? parsed.metadata.durationSeconds
                : undefined,
          });
        }
      }

      return NextResponse.json({ event }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
