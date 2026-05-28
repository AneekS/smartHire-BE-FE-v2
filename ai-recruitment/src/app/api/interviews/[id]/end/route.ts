import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { generateFeedbackReport } from "@/lib/interviews/feedback-generator";

export async function POST(
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

    await prisma.interviewSession.update({
      where: { id },
      data: { status: "completed" },
    });

    generateFeedbackReport(id).catch((err) =>
      console.error("generateFeedbackReport failed", err),
    );

    return NextResponse.json({ success: true });
  });
}
