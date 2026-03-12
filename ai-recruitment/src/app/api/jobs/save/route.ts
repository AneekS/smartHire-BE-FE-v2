import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { SaveJobSchema } from "@/lib/validators/job.schema";
import { cacheDelete } from "@/lib/cache";

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body = await req.json();
      const { jobId } = SaveJobSchema.parse(body);
      const id = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO "SavedJob" ("id", "userId", "jobId", "createdAt")
        VALUES (${id}, ${authedReq.user!.id}, ${jobId}, NOW())
        ON CONFLICT ("userId", "jobId") DO NOTHING
      `;

      await cacheDelete(`saved-jobs:${authedReq.user!.id}`);

      return NextResponse.json({ ok: true });
    } catch (error) {
      return handleError(error);
    }
  });
}

export async function DELETE(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const { searchParams } = new URL(req.url);
      const jobId = searchParams.get("jobId");

      if (!jobId) {
        return NextResponse.json({ error: "jobId is required" }, { status: 400 });
      }

      await prisma.$executeRaw`
        DELETE FROM "SavedJob"
        WHERE "userId" = ${authedReq.user!.id} AND "jobId" = ${jobId}
      `;

      await cacheDelete(`saved-jobs:${authedReq.user!.id}`);

      return NextResponse.json({ ok: true });
    } catch (error) {
      return handleError(error);
    }
  });
}
