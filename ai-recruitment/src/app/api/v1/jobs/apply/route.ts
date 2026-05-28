import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { JobApplySchema } from "@/lib/validators/job.schema";
import { handleError } from "@/lib/errors";

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const candidateId = authedReq.user!.candidateId;
      if (!candidateId) {
        return NextResponse.json(
          { error: "Candidate profile required to apply" },
          { status: 400 }
        );
      }

      const body = await req.json();
      const { job_id, cover_note } = JobApplySchema.parse(body);

      const existing = await prisma.application.findUnique({
        where: {
          jobId_candidateId: { jobId: job_id, candidateId },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Already applied" },
          { status: 409 }
        );
      }

      const activeResume = await prisma.resumeVersion.findFirst({
        where: { userId: authedReq.user!.id, status: "ACTIVE" },
        select: { id: true },
      });

      const application = await prisma.application.create({
        data: {
          jobId: job_id,
          candidateId,
          status: "APPLIED",
          aiScore: 0,
          aiNotes: cover_note ?? null,
        },
      });

      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          status: "APPLIED",
        },
      });

      await prisma.notification.create({
        data: {
          userId: authedReq.user!.id,
          type: "APPLICATION_STATUS_CHANGED",
          title: "Application Submitted!",
          message: "Your application has been submitted successfully.",
          metadata: { jobId: job_id, applicationId: application.id },
        },
      });

      return NextResponse.json(
        { application, ats_score: 0 },
        { status: 201 }
      );
    } catch (error) {
      return handleError(error);
    }
  });
}
