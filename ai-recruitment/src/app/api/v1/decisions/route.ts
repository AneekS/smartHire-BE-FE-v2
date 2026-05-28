import { NextResponse } from "next/server";
import { withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { RecruiterDecisionSchema } from "@/lib/validators/feedback.schema";
import { RecruiterDecisionService } from "@/feedback/decisions";

/**
 * POST /api/v1/decisions
 * Record a recruiter hiring decision with ATS score snapshot.
 */
export async function POST(req: AuthenticatedRequest) {
  return withRole(req, "RECRUITER", async (authedReq) => {
    try {
      const body = RecruiterDecisionSchema.parse(await req.json());
      const companyId = await RecruiterDecisionService.getRecruiterCompanyId(
        authedReq.user!.id
      );

      const tenantId =
        body.tenant_id ??
        RecruiterDecisionService.resolveTenantId(companyId);

      const decision = await RecruiterDecisionService.recordDecision({
        resumeId: body.resume_id,
        jobId: body.job_id,
        jobSource: body.job_source,
        tenantId,
        decision: body.decision,
        decisionReason: body.decision_reason,
        atsScoreAtDecision: body.ats_score_at_decision,
        scoreBreakdown: body.score_breakdown,
        roleType: body.role_type,
        recruiterId: authedReq.user!.id,
        candidateId: body.candidate_id,
      });

      return NextResponse.json({ decision }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
