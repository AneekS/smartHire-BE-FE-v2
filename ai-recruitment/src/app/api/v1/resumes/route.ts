import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { getResumeSasUrl } from "@/lib/azure-storage";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const resumes = await prisma.resumeVersion.findMany({
        where: { userId: authedReq.user!.id },
        orderBy: { createdAt: "desc" },
        include: { suggestions: true },
      });

      const result = await Promise.all(
        resumes.map(async (r) => {
          let fileUrl = r.fileUrl;
          if (r.filePath) {
            try {
              fileUrl = await getResumeSasUrl(r.filePath);
            } catch {
              fileUrl = null;
            }
          }

          return {
            id: r.id,
            title: r.title,
            fileUrl,
            roleTarget: r.roleTarget,
            atsScore: r.atsScore,
            status: r.status,
            updatedAt: r.updatedAt.toISOString(),
            suggestions: (r.suggestions ?? []).map((s) => ({
              id: s.id,
              type: s.type,
              section: s.section,
              title: s.title,
              description: s.description,
              applied: s.applied,
            })),
          };
        })
      );

      return NextResponse.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
