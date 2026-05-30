import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { ATSScoringService } from "@/services/ATSScoringService";
import { prisma } from "@/lib/db";

export async function GET(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authedReq) => {
    try {
      const { id } = await params;
      const tenantId = authedReq.tenantId!;

      const candidate = await prisma.candidate.findFirst({
        where: { userId: authedReq.user!.id },
        select: { id: true },
      });

      const row = await ATSScoringService.getById(id, tenantId, candidate?.id);

      if (!row) {
        return NextResponse.json({ error: "Score not found" }, { status: 404 });
      }

      if (row.source === "application_ats_score") {
        const s = row.data;
        return NextResponse.json({
          data: {
            id: s.id,
            source: row.source,
            jobId: s.jobId,
            resumeVersionId: s.resumeVersionId,
            finalScore: s.finalScore,
            semanticScore: s.semanticScore,
            skillScore: s.skillScore,
            experienceScore: s.experienceScore,
            complianceScore: s.complianceScore,
            projectScore: s.projectScore,
            educationScore: s.educationScore,
            qualityScore: s.qualityScore,
            confidence: s.confidence,
            requiresManualReview: s.requiresManualReview,
            industryProfile: s.industryProfile,
            seniorityBand: s.seniorityBand,
            computedAt: s.computedAt,
            skillGaps: s.skillGaps.map((g) => g.missingSkill),
            careerReadiness: s.careerReadiness,
            jobTitle: s.job?.title ?? null,
          },
        });
      }

      const legacy = row.data;
      const d = (legacy.details ?? {}) as Record<string, unknown>;
      return NextResponse.json({
        data: {
          id: legacy.id,
          source: row.source,
          jobListingId: legacy.listingId,
          finalScore: legacy.score,
          overallScore: legacy.score,
          ...d,
          createdAt: legacy.createdAt,
        },
      });
    } catch (error) {
      return handleError(error);
    }
  });
}
