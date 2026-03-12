import { NextResponse } from "next/server";
import { withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { RecruiterActivitySchema } from "@/lib/validators/application.schema";
import { trackRecruiterActivity } from "@/services/applications/application.service";

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

      return NextResponse.json({ activity }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
