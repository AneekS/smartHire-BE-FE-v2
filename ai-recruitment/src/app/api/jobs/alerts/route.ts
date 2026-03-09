import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { JobAlertSchema } from "@/lib/validators/job.schema";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const alerts = await prisma.$queryRaw<
        Array<{ id: string; role: string; location: string | null; createdAt: Date }>
      >`
        SELECT "id", "role", "location", "createdAt"
        FROM "JobAlert"
        WHERE "userId" = ${authedReq.user!.id}
        ORDER BY "createdAt" DESC
      `;

      return NextResponse.json({ alerts });
    } catch (error) {
      return handleError(error);
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body = await req.json();
      const { role, location } = JobAlertSchema.parse(body);
      const id = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO "JobAlert" ("id", "userId", "role", "location", "createdAt")
        VALUES (${id}, ${authedReq.user!.id}, ${role}, ${location ?? null}, NOW())
      `;

      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  });
}
