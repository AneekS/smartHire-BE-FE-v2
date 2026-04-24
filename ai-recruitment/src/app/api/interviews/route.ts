import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/insforge-server";
import type { InterviewSessionRow } from "@/lib/interviews/types";
import { totalQuestionsFor } from "@/lib/interviews/types";

const createSchema = z.object({
  role: z.string().min(1),
  interviewType: z.enum(["technical", "behavioral", "system_design", "dsa"]),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  durationMinutes: z.number().int().min(5).max(180).default(45),
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

export async function GET() {
  try {
    const { client, user } = await requireAuth();

    const { data, error } = await client.database
      .from("interview_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessions = ((data ?? []) as InterviewSessionRow[]).map(mapSession);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { client, user } = await requireAuth();

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.parse(body);

    const { data, error } = await client.database
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        role: parsed.role,
        interview_type: parsed.interviewType,
        difficulty: parsed.difficulty,
        duration_minutes: parsed.durationMinutes,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create session" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { session: mapSession(data as InterviewSessionRow) },
      { status: 201 },
    );
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
