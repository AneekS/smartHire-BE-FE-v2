import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { JobApplySchema } from "@/lib/validators/job.schema";
import { applyToJob } from "@/services/applications/application.service";

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body = await req.json();
      const { job_id, cover_note } = JobApplySchema.parse(body);

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [{ id: authedReq.user?.candidateId }, { email: authedReq.user?.email }],
        },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      // Use service layer: creates application + status history + analytics update
      const application = await applyToJob(candidate.id, job_id, cover_note);

      return NextResponse.json({ application }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
