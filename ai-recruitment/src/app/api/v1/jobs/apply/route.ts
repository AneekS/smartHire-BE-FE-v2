import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { requireAuth } from "@/lib/insforge-server";
import { JobApplySchema } from "@/lib/validators/job.schema";
import { ScorerService } from "@/services/resume/scorer.service";
import { handleError } from "@/lib/errors";

const scorer = new ScorerService();

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const body = await req.json();
    const { job_id, cover_note } = JobApplySchema.parse(body);

    const { client } = await requireAuth();

    const { data: existing } = await client.database
      .from("applications")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("job_id", job_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Already applied" },
        { status: 409 }
      );
    }

    const { data: activeResume } = await client.database
      .from("resumes")
      .select("id")
      .eq("candidate_id", candidateId)
      .eq("is_active", true)
      .maybeSingle();

    let atsScore = 0;
    if (activeResume) {
      try {
        const result = await scorer.computeJobScore(
          activeResume.id,
          candidateId,
          job_id
        );
        atsScore = result.score;
      } catch {
        // Continue without score
      }
    }

    const { data: application, error } = await client.database
      .from("applications")
      .insert({
        candidate_id: candidateId,
        job_id,
        resume_id: activeResume?.id ?? null,
        ats_score: atsScore,
        cover_note: cover_note ?? null,
        status_history: [
          { status: "APPLIED", timestamp: new Date().toISOString() },
        ],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await client.database.from("notifications").insert({
      candidate_id: candidateId,
      type: "APPLICATION_SUBMITTED",
      title: "Application Submitted!",
      message: "Your application has been submitted successfully.",
      data: { job_id, application_id: application.id },
    });

    return NextResponse.json(
      { application, ats_score: atsScore },
      { status: 201 }
    );
  });
}
