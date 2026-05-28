import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req as AuthenticatedRequest, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId;
    if (!candidateId) {
      return NextResponse.json({ error: "No candidate profile" }, { status: 400 });
    }

    const { id } = await params;

    const session = await prisma.interviewSession.findFirst({
      where: { id, candidateId },
    });

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const feedback = await prisma.interviewFeedback.findUnique({
      where: { sessionId: id },
    });

    let parsedFeedback = null;
    if (feedback) {
      try {
        parsedFeedback = JSON.parse(feedback.summary);
        parsedFeedback.overallScore = feedback.score;
        parsedFeedback.createdAt = feedback.createdAt;
      } catch {
        parsedFeedback = {
          summary: feedback.summary,
          overallScore: feedback.score,
          createdAt: feedback.createdAt,
        };
      }
    }

    return NextResponse.json({
      session,
      feedback: parsedFeedback,
      status: feedback ? "ready" : "generating",
    });
  });
}
