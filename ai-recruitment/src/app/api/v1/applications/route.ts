import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { ApplicationApplySchema, ApplicationListQuerySchema } from "@/lib/validators/application.schema";
import {
  applyToJob,
  getCandidateApplications,
} from "@/services/applications/application.service";
import { prisma } from "@/lib/db";

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const body = await req.json();
      const { job_id, cover_note } = ApplicationApplySchema.parse(body);

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { id: authedReq.user?.candidateId },
            { email: authedReq.user?.email },
          ],
          tenantId,
        },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const application = await applyToJob(candidate.id, job_id, cover_note);

      return NextResponse.json({ data: { application } }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const url = new URL(req.url);
      const params = ApplicationListQuerySchema.parse({
        status: url.searchParams.get("status") ?? undefined,
        cursor: url.searchParams.get("cursor") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
      });

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [
            { id: authedReq.user?.candidateId },
            { email: authedReq.user?.email },
          ],
          tenantId,
        },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const result = await getCandidateApplications(candidate.id, params);

      return NextResponse.json({ data: result });
    } catch (error) {
      return handleError(error);
    }
  });
}
