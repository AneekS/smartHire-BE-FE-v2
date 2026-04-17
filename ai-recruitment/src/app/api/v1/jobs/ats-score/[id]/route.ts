import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { insforge } from "@/lib/insforge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth(req);
    const { id } = await params;

    const { data, error } = await insforge.database
      .from("job_ats_scores")
      .select("*")
      .eq("id", id)
      .eq("candidate_id", dbUser.id)
      .single();

    if (error || !data) return err("Score not found", 404);

    return ok({
      id: data.id,
      jobTitle: data.job_title,
      companyName: data.company_name,
      jobListingId: data.job_listing_id ?? null,
      overallScore: data.overall_score,
      scoreLabel: data.score_label ?? "Match",
      matchSummary: data.match_summary,
      breakdown: data.breakdown,
      keywordAnalysis: data.keyword_analysis,
      sectionScores: data.section_scores,
      recommendations: data.recommendations,
      competitiveAnalysis: data.competitive_analysis,
      tailoredSummary: data.tailored_summary,
      topMissingKeywordsToAdd: data.top_missing_keywords ?? [],
      createdAt: data.created_at,
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg = error instanceof Error ? error.message : "Fetch failed";
    return err(msg, 500);
  }
}
