import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { BlobStorageService } from "@/lib/BlobStorageService";
import { getResumeStudioPayloadById } from "@/services/resumes/resume-studio.service";

export async function GET(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authedReq) => {
    const { id } = await params;
    const tenantId = authedReq.tenantId!;

    const payload = await getResumeStudioPayloadById(
      id,
      authedReq.user!.id,
      tenantId
    );

    if (!payload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...payload,
        id: payload.resumeId,
        title: payload.fileName,
        createdAt: payload.uploadedAt,
        updatedAt: payload.uploadedAt,
        suggestions: payload.improvements,
      },
    });
  });
}

export async function DELETE(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authedReq) => {
    const { id } = await params;
    const tenantId = authedReq.tenantId!;

    const version = await prisma.resumeVersion.findFirst({
      where: { id, userId: authedReq.user!.id, tenantId },
      select: { id: true, filePath: true },
    });

    if (!version) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (version.filePath) {
      try {
        await BlobStorageService.deleteResume(version.filePath);
      } catch (err) {
        console.warn("[DELETE resume] blob soft-delete failed:", err);
      }
    }

    await prisma.resumeVersion.update({
      where: { id: version.id },
      data: {
        filePath: null,
        fileUrl: null,
        pipelineError: "soft-deleted",
        status: "DRAFT",
      },
    });

    return NextResponse.json({ data: { id: version.id, deleted: true } });
  });
}
