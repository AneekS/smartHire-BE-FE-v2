import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { toLegacyParseStatus } from "@/lib/pipeline-status";

export async function GET(
  _req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(_req, async (authedReq) => {
    const { id } = await params;
    const version = await prisma.resumeVersion.findFirst({
      where: { id, userId: authedReq.user!.id },
      include: { parsedResume: true },
    });

    if (!version) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const status = toLegacyParseStatus(
      version.pipelineStatus,
      Boolean(version.parsedResume)
    );

    return NextResponse.json({
      resumeVersionId: version.id,
      status,
      pipelineStatus: version.pipelineStatus,
      atsScore: version.atsScore,
      hasParsedData: Boolean(version.parsedResume),
      updatedAt: version.updatedAt.toISOString(),
    });
  });
}
