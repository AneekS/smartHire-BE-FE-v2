import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { ApplicationApplySchema, ApplicationListQuerySchema } from "@/lib/validators/application.schema";
import {
  applyToJob,
  getCandidateApplications,
  getCandidateDashboardAnalytics,
  getSmartReminders,
} from "@/services/applications/application.service";
import { prisma } from "@/lib/db";

/**
 * POST /api/v1/applications
 * Apply to a job
 */
export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body = await req.json();
      const { job_id, cover_note } = ApplicationApplySchema.parse(body);

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { id: authedReq.user?.candidateId },
            { email: authedReq.user?.email },
          ],
        },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const application = await applyToJob(candidate.id, job_id, cover_note);

      return NextResponse.json({ application }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}

/**
 * GET /api/v1/applications
 * List candidate applications (pipeline view)
 *
 * Query params: status, cursor, limit
 */
export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const url = new URL(req.url);
      const params = ApplicationListQuerySchema.parse({
        status: url.searchParams.get("status") ?? undefined,
        cursor: url.searchParams.get("cursor") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
      });

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { id: authedReq.user?.candidateId },
            { email: authedReq.user?.email },
          ],
        },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const result = await getCandidateApplications(candidate.id, params);

      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  });
}
