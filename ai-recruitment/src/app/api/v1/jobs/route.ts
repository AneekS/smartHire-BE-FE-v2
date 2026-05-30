import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { JobCreateSchema } from "@/lib/validators/ats.schema";
import { resolveTenantId } from "@/lib/tenant-context";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

    let tenantId: string | undefined;
    const { userId } = await auth();
    if (userId) {
      tenantId = await resolveTenantId();
    }

    const jobs = await prisma.job.findMany({
      where: {
        status: "ACTIVE",
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({ data: jobs, meta: { page, limit } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: AuthenticatedRequest) {
  return withRole(req, "RECRUITER", async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const body = JobCreateSchema.safeParse(await req.json());
      if (!body.success) {
        return NextResponse.json(
          { error: body.error.flatten() },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: authedReq.user!.id },
        select: { companyId: true },
      });

      const companyId = body.data.companyId ?? user?.companyId;
      if (!companyId) {
        return NextResponse.json(
          { error: "companyId required" },
          { status: 400 }
        );
      }

      const job = await prisma.job.create({
        data: {
          title: body.data.title,
          description: body.data.description,
          requirements: body.data.requirements,
          location: body.data.location,
          type: body.data.type,
          salaryMin: body.data.salaryMin,
          salaryMax: body.data.salaryMax,
          experienceMin: body.data.experienceMin,
          experienceMax: body.data.experienceMax,
          workMode: body.data.workMode,
          requiredSkills: body.data.requiredSkills,
          userId: authedReq.user!.id,
          companyId,
          tenantId,
          status: "ACTIVE",
        },
      });

      return NextResponse.json({ data: job }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
