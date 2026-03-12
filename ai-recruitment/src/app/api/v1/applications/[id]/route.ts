import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { ApplicationStatusUpdateSchema } from "@/lib/validators/application.schema";
import {
  getApplicationDetail,
  changeApplicationStatus,
} from "@/services/applications/application.service";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/applications/:id
 * Get full application detail including timeline, recruiter activity, scores
 */
export async function GET(req: AuthenticatedRequest, ctx: RouteContext) {
  return withAuth(req, async (authedReq) => {
    try {
      const { id } = await ctx.params;

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

      const detail = await getApplicationDetail(id, candidate.id);

      return NextResponse.json(detail);
    } catch (error) {
      return handleError(error);
    }
  });
}

/**
 * PATCH /api/v1/applications/:id
 * Update application status
 */
export async function PATCH(req: AuthenticatedRequest, ctx: RouteContext) {
  return withAuth(req, async (authedReq) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json();
      const { status, metadata } = ApplicationStatusUpdateSchema.parse(body);

      const updated = await changeApplicationStatus(
        id,
        status,
        authedReq.user?.id ?? "",
        metadata
      );

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
