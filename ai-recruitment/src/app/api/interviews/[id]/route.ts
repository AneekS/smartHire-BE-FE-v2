import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/insforge-server";
import type {
  InterviewMessageRow,
  InterviewSessionRow,
} from "@/lib/interviews/types";
import { totalQuestionsFor } from "@/lib/interviews/types";

const patchSchema = z.object({
  status: z.enum(["setup", "active", "completed", "abandoned"]).optional(),
});

function mapSession(s: InterviewSessionRow) {
  return {
    id: s.id,
    userId: s.user_id,
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

function mapMessage(m: InterviewMessageRow) {
  return {
    id: m.id,
    sessionId: m.session_id,
    role: m.role,
    content: m.content,
    questionNumber: m.question_number,
    createdAt: m.created_at,
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

    const messagesRes = await client.database
      .from("interview_messages")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    const messages = ((messagesRes.data ?? []) as InterviewMessageRow[]).map(
      mapMessage,
    );

    return NextResponse.json({
      session: mapSession(session),
      messages,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.parse(body);

    const update: Record<string, unknown> = {};
    if (parsed.status) {
      update.status = parsed.status;
      if (parsed.status === "completed" || parsed.status === "abandoned") {
        update.ended_at = new Date().toISOString();
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const { data, error } = await client.database
      .from("interview_sessions")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      session: mapSession(data as InterviewSessionRow),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
