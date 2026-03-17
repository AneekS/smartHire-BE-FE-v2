import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { prisma } from "@/lib/db";

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, client } = await requireAuth();
    const { id } = await params;

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email ?? undefined },
    });
    if (!dbUser) return err("User not found", 404);

    const { data, error } = await client.database
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
    const msg =
      error instanceof Error ? error.message : "Fetch failed";
    return err(msg, 500);
  }
}
