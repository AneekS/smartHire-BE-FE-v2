import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["setup", "active", "completed", "abandoned"]).optional(),
});

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

    const messages = await prisma.interviewMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ session, messages });
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req as AuthenticatedRequest, async (authedReq) => {
    try {
      const candidateId = authedReq.user!.candidateId;
      if (!candidateId) {
        return NextResponse.json({ error: "No candidate profile" }, { status: 400 });
      }

      const { id } = await params;
      const body = await authedReq.json().catch(() => ({}));
      const parsed = patchSchema.parse(body);

      if (!parsed.status) {
        return NextResponse.json({ error: "No changes" }, { status: 400 });
      }

      const existing = await prisma.interviewSession.findFirst({
        where: { id, candidateId },
      });

      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const session = await prisma.interviewSession.update({
        where: { id },
        data: { status: parsed.status },
      });

      return NextResponse.json({ session });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: err.issues.map((i) => i.message).join(", ") },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
    }
  });
}
