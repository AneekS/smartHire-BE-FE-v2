import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";
import { insforge } from "@/lib/insforge";

const messageSchema = z.object({
  content: z.string().min(1),
});

const SYSTEM_PROMPT = `You are an experienced technical interviewer for software engineering roles. Ask one clear question at a time. Be professional but friendly. After the candidate answers, give brief feedback (1-2 sentences) then ask the next question. Focus on: problem-solving, system design, algorithms, or behavioral (STAR) depending on context.`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data: session, error: sessionError } = await client.database
      .from("mock_interview_sessions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { content } = messageSchema.parse(body);

    const { data: userMsg, error: msgError } = await client.database
      .from("mock_interview_messages")
      .insert({
        session_id: id,
        role: "USER",
        content,
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    const { data: history } = await client.database
      .from("mock_interview_messages")
      .select("role, content")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    const messages = (history ?? []).map((m) =>
      m.role === "USER"
        ? { role: "user" as const, content: m.content }
        : { role: "assistant" as const, content: m.content }
    );

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
        {
          role: "user",
          content:
            "The candidate just said: " +
            content +
            ". Respond as the interviewer (next question or feedback).",
        },
      ],
    });

    const fullResponse =
      completion.choices[0]?.message?.content ?? "I have no further questions.";

    const { data: assistantMsg, error: assistError } = await client.database
      .from("mock_interview_messages")
      .insert({
        session_id: id,
        role: "ASSISTANT",
        content: fullResponse,
      })
      .select()
      .single();

    if (assistError) {
      return NextResponse.json({ error: assistError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: {
        id: assistantMsg.id,
        sessionId: assistantMsg.session_id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        createdAt: assistantMsg.created_at,
      },
      streamedContent: fullResponse,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Send failed" },
      { status: 500 }
    );
  }
}
