import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { requireAuth } from "@/lib/insforge-server";
import { insforge } from "@/lib/insforge";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const { client } = await requireAuth();

    const { data: sessions, error } = await client.database
      .from("mock_interviews")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("started_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (sessions ?? []).map((s) => ({
      id: s.id,
      title: s.target_role,
      type: s.session_type ?? "TECHNICAL",
      status: s.status ?? "IN_PROGRESS",
      startedAt: s.started_at,
      messages: (s.messages ?? []).map((m: { role?: string; content?: string }) => ({
        id: crypto.randomUUID(),
        role: (m.role === "user" ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
        content: m.content ?? "",
        createdAt: new Date().toISOString(),
      })),
    }));

    return NextResponse.json(mapped);
  });
}

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  target_role: z.string().optional(),
  session_type: z
    .enum(["BEHAVIORAL", "TECHNICAL", "HR", "SYSTEM_DESIGN", "MIXED"])
    .default("BEHAVIORAL"),
  sessionId: z.string().uuid().optional(),
});

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const body = await req.json();
    const { messages, target_role, session_type, sessionId } =
      BodySchema.parse(body);

    const role = target_role ?? "Software Engineer";
    const systemPrompt = `You are an experienced ${session_type === "TECHNICAL" ? "technical" : "HR"} interviewer at a mid-size Indian IT company hiring for: ${role}

RULES:
- Ask ONE question at a time
- After each answer, give brief acknowledgment then ask next question
- After 6-8 questions, end with: "That concludes our interview. Thank you!"
- Then provide a JSON feedback block wrapped in <FEEDBACK>...</FEEDBACK> tags
- Feedback JSON: { overall_score, clarity_score, confidence_score, structure_score, technical_accuracy, strengths: [], improvements: [], detailed_feedback: string }

Start with: "Hello! I'm your ${role} interviewer. Let's begin. Tell me about yourself."`;

    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const userContent = lastUserMsg
      ? `The candidate just said: ${lastUserMsg.content}. Respond as the interviewer (next question or feedback).`
      : "Start the interview.";

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: [
        ...messages.map((m) =>
          m.role === "user"
            ? { role: "user" as const, content: m.content }
            : { role: "assistant" as const, content: m.content }
        ),
        { role: "user" as const, content: userContent },
      ],
      onFinish: async ({ text }) => {
        if (sessionId) {
          const { client } = await requireAuth();
          const feedbackMatch = text.match(/<FEEDBACK>([\s\S]*?)<\/FEEDBACK>/);
          const feedback = feedbackMatch
            ? (() => {
                try {
                  return JSON.parse(feedbackMatch[1]);
                } catch {
                  return null;
                }
              })()
            : null;

          await client.database
            .from("mock_interviews")
            .update({
              messages: [
                ...messages,
                { role: "assistant", content: text },
              ],
              feedback,
              status: feedback ? "COMPLETED" : "IN_PROGRESS",
              completed_at: feedback ? new Date().toISOString() : null,
            })
            .eq("id", sessionId);
        }
      },
    });

    return result.toTextStreamResponse();
  });
}
