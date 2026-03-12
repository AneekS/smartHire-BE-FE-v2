import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { withdrawApplication } from "@/services/applications/application.service";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/applications/:id/withdraw
 * Withdraw an application
 */
export async function POST(req: AuthenticatedRequest, ctx: RouteContext) {
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

      const updated = await withdrawApplication(id, candidate.id);

      return NextResponse.json(updated);
    } catch (error) {
      return handleError(error);
    }
  });
}
