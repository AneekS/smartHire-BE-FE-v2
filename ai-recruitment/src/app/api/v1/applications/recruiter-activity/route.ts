import { NextResponse } from "next/server";
import { withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { RecruiterActivitySchema } from "@/lib/validators/application.schema";
import { trackRecruiterActivity } from "@/services/applications/application.service";
import { notifyCandidateShortlisted, notifyRecruiterViewedCandidate } from "@/modules/preferences/services/preference-notification.service";
import { prisma } from "@/lib/db";

/**
 * POST /api/v1/applications/recruiter-activity
 * Track recruiter activity on an application (recruiter only)
 */
export async function POST(req: AuthenticatedRequest) {
  return withRole(req, "RECRUITER", async (authedReq) => {
    try {
      const body = await req.json();
      const { application_id, activity_type, metadata } =
        RecruiterActivitySchema.parse(body);

      const activity = await trackRecruiterActivity(
        application_id,
        activity_type,
        metadata
      );

      if (activity_type === "PROFILE_VIEWED" || activity_type === "SHORTLISTED") {
        const app = await prisma.application.findUnique({
          where: { id: application_id },
          select: {
            candidate: { select: { userId: true } },
            job: { select: { company: { select: { name: true } } } },
          },
        });

        const candidateUserId = app?.candidate.userId;
        if (candidateUserId && activity_type === "PROFILE_VIEWED") {
          const recruiter = await prisma.user.findUnique({
            where: { id: authedReq.user?.id },
            select: { name: true },
          });

          void notifyRecruiterViewedCandidate(
            candidateUserId,
            recruiter?.name ?? undefined,
            app?.job.company.name,
          );
        }
      }

      if (activity_type === "SHORTLISTED") {
        void notifyCandidateShortlisted(application_id);
      }

      return NextResponse.json({ activity }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
