import { NextResponse } from "next/server";
import { withAuth, withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { JobPatchSchema } from "@/lib/validators/ats.schema";
import { prisma } from "@/lib/db";

export async function GET(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authedReq) => {
    try {
      const { id } = await params;
      const tenantId = authedReq.tenantId!;

      const job = await prisma.job.findFirst({
        where: { id, tenantId, status: "ACTIVE" },
        include: { company: { select: { name: true } } },
      });

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json({
        data: {
          ...job,
          companyName: job.company.name,
        },
      });
    } catch (error) {
      return handleError(error);
    }
  });
}

export async function PATCH(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(req, "RECRUITER", async (authedReq) => {
    try {
      const { id } = await params;
      const tenantId = authedReq.tenantId!;

      const existing = await prisma.job.findFirst({
        where: { id, tenantId },
        select: { id: true, userId: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      if (existing.userId !== authedReq.user!.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = JobPatchSchema.safeParse(await req.json());
      if (!body.success) {
        return NextResponse.json(
          { error: body.error.flatten() },
          { status: 400 }
        );
      }

      const job = await prisma.job.update({
        where: { id },
        data: body.data,
      });

      return NextResponse.json({ data: job });
    } catch (error) {
      return handleError(error);
    }
  });
}
