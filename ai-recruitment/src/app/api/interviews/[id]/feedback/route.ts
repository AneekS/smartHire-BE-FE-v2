import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import type {
  InterviewFeedbackRow,
  InterviewSessionRow,
} from "@/lib/interviews/types";
import { totalQuestionsFor } from "@/lib/interviews/types";

function mapSession(s: InterviewSessionRow) {
  return {
    id: s.id,
    role: s.role,
    interviewType: s.interview_type,
    difficulty: s.difficulty,
    status: s.status,
    durationMinutes: s.duration_minutes,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    overallScore: s.overall_score,
    createdAt: s.created_at,
    totalQuestions: totalQuestionsFor(s.duration_minutes),
  };
}

function mapFeedback(f: InterviewFeedbackRow) {
  return {
    overallScore: f.overall_score,
    technicalScore: f.technical_score,
    communicationScore: f.communication_score,
    depthScore: f.depth_score,
    strengths: f.strengths ?? [],
    improvements: f.improvements ?? [],
    recommendedResources: f.recommended_resources ?? [],
    summary: f.summary ?? "",
    createdAt: f.created_at,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const sessionRes = await client.database
      .from("interview_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    const session = sessionRes.data as InterviewSessionRow | null;
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const feedbackRes = await client.database
      .from("interview_feedback")
      .select("*")
      .eq("session_id", id)
      .maybeSingle();

    const feedback = feedbackRes.data as InterviewFeedbackRow | null;

    return NextResponse.json({
      session: mapSession(session),
      feedback: feedback ? mapFeedback(feedback) : null,
      status: feedback ? "ready" : "generating",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
