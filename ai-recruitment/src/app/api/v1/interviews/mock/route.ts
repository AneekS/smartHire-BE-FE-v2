import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const userId = authedReq.user!.id;

    const sessions = await prisma.mockInterviewSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    const mapped = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      status: s.status,
      startedAt: s.startedAt,
      messages: s.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
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
  sessionId: z.string().optional(),
});

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
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

          await prisma.mockInterviewSession.update({
            where: { id: sessionId },
            data: {
              aiFeedback: feedback ? JSON.stringify(feedback) : undefined,
              status: feedback ? "COMPLETED" : "IN_PROGRESS",
              endedAt: feedback ? new Date() : undefined,
            },
          });

          // Save assistant message
          await prisma.mockInterviewMessage.create({
            data: {
              sessionId,
              role: "ASSISTANT",
              content: text,
            },
          });
        }
      },
    });

    return result.toTextStreamResponse();
  });
}
