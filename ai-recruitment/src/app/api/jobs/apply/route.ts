import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { JobApplySchema } from "@/lib/validators/job.schema";

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body = await req.json();
      const { job_id, cover_note } = JobApplySchema.parse(body);

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [{ id: authedReq.user?.candidateId }, { email: authedReq.user?.email }],
        },
        select: {
          id: true,
          name: true,
          email: true,
          headline: true,
          summary: true,
          location: true,
          resumeUrl: true,
          skills: true,
        },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const existing = await prisma.application.findUnique({
        where: {
          jobId_candidateId: {
            jobId: job_id,
            candidateId: candidate.id,
          },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ error: "Already applied" }, { status: 409 });
      }

      const profileSnapshot = {
        resumeUrl: candidate.resumeUrl,
        profile: {
          name: candidate.name,
          email: candidate.email,
          headline: candidate.headline,
          summary: candidate.summary,
          location: candidate.location,
        },
        skills: candidate.skills ?? [],
      };

      const application = await prisma.application.create({
        data: {
          jobId: job_id,
          candidateId: candidate.id,
          status: "APPLIED",
          aiNotes: JSON.stringify({
            oneClickApply: true,
            coverNote: cover_note ?? null,
            profileSnapshot,
            submittedAt: new Date().toISOString(),
          }),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          jobId: true,
        },
      });

      return NextResponse.json({ application }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
