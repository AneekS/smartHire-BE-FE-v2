import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  listingId: z.string().optional(),
});

export async function GET(req: Request) {
  return withAuth(req as AuthenticatedRequest, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId;
    if (!candidateId) {
      return NextResponse.json({ error: "No candidate profile" }, { status: 400 });
    }

    const sessions = await prisma.interviewSession.findMany({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  });
}

export async function POST(req: Request) {
  return withAuth(req as AuthenticatedRequest, async (authedReq) => {
    try {
      const candidateId = authedReq.user!.candidateId;
      if (!candidateId) {
        return NextResponse.json({ error: "No candidate profile" }, { status: 400 });
      }

      const body = await authedReq.json().catch(() => ({}));
      const parsed = createSchema.parse(body);

      const session = await prisma.interviewSession.create({
        data: {
          candidateId,
          listingId: parsed.listingId,
          status: "active",
        },
      });

      return NextResponse.json({ session }, { status: 201 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: err.issues.map((i) => i.message).join(", ") },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
  });
}
