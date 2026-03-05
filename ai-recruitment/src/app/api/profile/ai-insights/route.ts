/**
 * /api/profile/ai-insights
 * GET – returns AI-generated insights for the authenticated candidate
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate } from "@/services/profile/profile.service";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    const candidate = await getOrCreateCandidate(r.user!.email);
    const insights = (candidate as { aiInsights?: unknown }).aiInsights;
    if (!insights) {
      return NextResponse.json({
        extractedSkills:           [],
        experienceSummary:         null,
        careerLevel:               null,
        roleReadinessScore:        null,
        skillStrengthDistribution: {},
        suggestedImprovements:     [],
        lastAnalyzedAt:            null,
      });
    }
    return NextResponse.json(insights);
  });
}
