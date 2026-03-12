import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { ApplicationNoteSchema } from "@/lib/validators/application.schema";
import { addNote } from "@/services/applications/application.service";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/applications/:id/notes
 * Add a note to an application
 */
export async function POST(req: AuthenticatedRequest, ctx: RouteContext) {
  return withAuth(req, async (authedReq) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json();
      const { content } = ApplicationNoteSchema.parse(body);

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

      const note = await addNote(
        id,
        candidate.id,
        content,
        authedReq.user?.role ?? "CANDIDATE"
      );

      return NextResponse.json({ note }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
