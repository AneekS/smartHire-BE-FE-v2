import { NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { ScorerService } from "@/services/resume/scorer.service";
import { OptimizerService } from "@/services/resume/optimizer.service";
import { requireAuth } from "@/lib/insforge-server";

const scorer = new ScorerService();
const optimizer = new OptimizerService();

export async function GET(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;
    const { jobId } = await params;

    const { client } = await requireAuth();

    const { data: activeResume } = await client.database
      .from("resumes")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("is_active", true)
      .eq("parse_status", "DONE")
      .maybeSingle();

    if (!activeResume) {
      return NextResponse.json(
        { error: "No parsed resume found" },
        { status: 404 }
      );
    }

    const result = await scorer.computeJobScore(
      activeResume.id,
      candidateId,
      jobId
    );

    const suggestions = await optimizer.generateSuggestions(
      activeResume.id,
      candidateId,
      jobId
    );

    return NextResponse.json({ ...result, suggestions });
  });
}
