import { NextResponse } from "next/server";
import { withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { RecruiterCorrectionSchema } from "@/lib/validators/feedback.schema";
import { TaxonomyExpander } from "@/feedback/taxonomy";

/**
 * POST /api/v1/corrections
 * Record a recruiter field correction; may auto-expand skill taxonomy.
 */
export async function POST(req: AuthenticatedRequest) {
  return withRole(req, "RECRUITER", async (authedReq) => {
    try {
      const body = RecruiterCorrectionSchema.parse(await req.json());

      const result = await TaxonomyExpander.processCorrection({
        resumeId: body.resume_id,
        field: body.field,
        originalValue: body.original_value,
        correctedValue: body.corrected_value,
        recruiterId: authedReq.user!.id,
      });

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
