import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data: session, error } = await client.database
      .from("mock_interview_sessions")
      .select("*, mock_interview_messages(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = (session.mock_interview_messages ?? [])
      .sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          new Date(a.created_at as string).getTime() -
          new Date(b.created_at as string).getTime()
      )
      .map(mapMessage);

    return NextResponse.json({
      ...mapSession(session),
      messages,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data: existing } = await client.database
      .from("mock_interview_sessions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body.status === "COMPLETED") update.status = "COMPLETED";
    if (typeof body.aiFeedback === "string") update.ai_feedback = body.aiFeedback;
    if (body.status === "COMPLETED") update.ended_at = new Date().toISOString();
    update.updated_at = new Date().toISOString();

    const { data: session, error } = await client.database
      .from("mock_interview_sessions")
      .update(update)
      .eq("id", id)
      .select("*, mock_interview_messages(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const messages = (session.mock_interview_messages ?? []).map(mapMessage);
    return NextResponse.json({ ...mapSession(session), messages });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
