import { NextResponse } from "next/server";
import {
  withAuth,
  type AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { getResumeSasUrl } from "@/lib/azure-storage";
import { handleResumeUpload } from "@/services/resumes/resume-upload.service";

export const maxDuration = 600;

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const userId = authedReq.user!.id;

      // Align legacy rows to the user's tenant (post-migration backfill)
      await prisma.resumeVersion.updateMany({
        where: {
          userId,
          OR: [{ tenantId: null }, { tenantId: { not: tenantId } }],
        },
        data: { tenantId },
      });

      const resumes = await prisma.resumeVersion.findMany({
        where: { userId },
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

      return NextResponse.json({ data: result });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      return await handleResumeUpload(authedReq);
    } catch (e) {
      console.error("[POST /api/v1/resumes]", e);
      const msg = e instanceof Error ? e.message : "Upload error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
