import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/insforge-server";
import { buildInterviewContext } from "@/lib/interviews/context-builder";
import { getInterviewerResponse } from "@/lib/interviews/claude-interviewer";
import { analyzeResponse } from "@/lib/interviews/response-analyzer";
import type {
  InterviewMessageRow,
  InterviewSessionRow,
} from "@/lib/interviews/types";
import { totalQuestionsFor } from "@/lib/interviews/types";

const START_TOKEN = "[START_INTERVIEW]";

const bodySchema = z.object({
  content: z.string().min(1),
  questionNumber: z.number().int().min(0).default(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const { content, questionNumber } = bodySchema.parse(body);

    const sessionRes = await client.database
      .from("interview_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    const session = sessionRes.data as InterviewSessionRow | null;
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status === "completed" || session.status === "abandoned") {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: 409 },
      );
    }

    const historyRes = await client.database
      .from("interview_messages")
      .select("id, role, content, question_number, created_at, session_id")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    const history = (historyRes.data ?? []) as InterviewMessageRow[];

    const isFirstTurn = content === START_TOKEN;
    let candidateMessageId: string | null = null;

    // Persist the candidate's answer (skip on the very first kick-off turn).
    if (!isFirstTurn) {
      const insertRes = await client.database
        .from("interview_messages")
        .insert({
          session_id: id,
          role: "candidate",
          content,
          question_number: questionNumber,
        })
        .select()
        .single();

      if (insertRes.error || !insertRes.data) {
        return NextResponse.json(
          { error: insertRes.error?.message ?? "Failed to save message" },
          { status: 500 },
        );
      }
      candidateMessageId = (insertRes.data as InterviewMessageRow).id;
      history.push(insertRes.data as InterviewMessageRow);
    }

    const totalQuestions = totalQuestionsFor(session.duration_minutes);
    const nextQuestionNumber = isFirstTurn ? 1 : questionNumber + 1;
    const isComplete = nextQuestionNumber > totalQuestions;

    const context = await buildInterviewContext({
      client,
      userId: user.id,
      session,
      history,
      questionNumber: Math.min(nextQuestionNumber, totalQuestions),
    });

    const aiMessage = await getInterviewerResponse(context);

    const aiInsertRes = await client.database
      .from("interview_messages")
      .insert({
        session_id: id,
        role: "interviewer",
        content: aiMessage,
        question_number: Math.min(nextQuestionNumber, totalQuestions),
      })
      .select()
      .single();

    if (aiInsertRes.error || !aiInsertRes.data) {
      return NextResponse.json(
        { error: aiInsertRes.error?.message ?? "Failed to save AI message" },
        { status: 500 },
      );
    }

    if (candidateMessageId && !isFirstTurn) {
      const lastInterviewerMsg = [...history]
        .reverse()
        .find((m) => m.role === "interviewer");
      if (lastInterviewerMsg) {
        analyzeResponse({
          client,
          sessionId: id,
          messageId: candidateMessageId,
          questionText: lastInterviewerMsg.content,
          answerText: content,
          role: session.role,
          interviewType: session.interview_type,
        }).catch((err) => console.error("analyzeResponse failed", err));
      }
    }

    return NextResponse.json({
      message: {
        id: (aiInsertRes.data as InterviewMessageRow).id,
        role: "interviewer" as const,
        content: aiMessage,
        questionNumber: Math.min(nextQuestionNumber, totalQuestions),
        createdAt: (aiInsertRes.data as InterviewMessageRow).created_at,
      },
      questionNumber: Math.min(nextQuestionNumber, totalQuestions),
      totalQuestions,
      isComplete,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    console.error("POST /api/interviews/[id]/message failed", err);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
