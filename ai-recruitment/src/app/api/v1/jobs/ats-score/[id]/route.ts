import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth(req);
    const { id } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    });
    if (!candidate) return err("Candidate profile not found", 404);

    const score = await prisma.jobAtsScore.findFirst({
      where: { id, candidateId: candidate.id },
    });

    if (!score) return err("Score not found", 404);

    const d = (score.details ?? {}) as Record<string, unknown>;

    return ok({
      id: score.id,
      jobTitle: d.jobTitle ?? null,
      companyName: d.companyName ?? null,
      jobListingId: score.listingId,
      overallScore: score.score,
      scoreLabel: d.scoreLabel ?? "Match",
      matchSummary: d.matchSummary ?? null,
      breakdown: d.breakdown ?? null,
      keywordAnalysis: d.keywordAnalysis ?? null,
      sectionScores: d.sectionScores ?? null,
      recommendations: d.recommendations ?? null,
      competitiveAnalysis: d.competitiveAnalysis ?? null,
      tailoredSummary: d.tailoredSummary ?? null,
      topMissingKeywordsToAdd: d.topMissingKeywordsToAdd ?? [],
      createdAt: score.createdAt,
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg = error instanceof Error ? error.message : "Fetch failed";
    return err(msg, 500);
  }
}
