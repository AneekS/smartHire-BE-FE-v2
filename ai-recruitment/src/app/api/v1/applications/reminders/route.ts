import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { getSmartReminders } from "@/services/applications/application.service";
import { prisma } from "@/lib/db";

/**
 * GET /api/v1/applications/reminders
 * Get smart reminders for candidate
 */
export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
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

      const reminders = await getSmartReminders(candidate.id);

      return NextResponse.json({ reminders });
    } catch (error) {
      return handleError(error);
    }
  });
}
