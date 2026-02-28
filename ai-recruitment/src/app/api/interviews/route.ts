import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().optional(),
  type: z.enum(["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN"]).optional(),
});

function mapSession(s: Record<string, unknown>) {
  return {
    id: s.id,
    userId: s.user_id,
    title: s.title,
    type: s.type,
    status: s.status,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    transcript: s.transcript,
    aiFeedback: s.ai_feedback,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

function mapMessage(m: Record<string, unknown>) {
  return {
    id: m.id,
    sessionId: m.session_id,
    role: m.role,
    content: m.content,
    createdAt: m.created_at,
  };
}

export async function GET() {
  try {
    const { client, user } = await requireAuth();

    const { data: sessions, error } = await client.database
      .from("mock_interview_sessions")
      .select("*, mock_interview_messages(*)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (sessions ?? []).map((s) => ({
      ...mapSession(s),
      messages: (s.mock_interview_messages ?? []).map(mapMessage),
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { client, user } = await requireAuth();

    const body = await req.json().catch(() => ({}));
    const { title, type } = createSchema.parse(body);

    const { data: session, error } = await client.database
      .from("mock_interview_sessions")
      .insert({
        user_id: user.id,
        title: title ?? "Mock Interview",
        type: type ?? "TECHNICAL",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...mapSession(session),
      messages: [],
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
