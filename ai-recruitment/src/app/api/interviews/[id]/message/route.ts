import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { buildInterviewContext } from "@/lib/interviews/context-builder";
import { getInterviewerResponse } from "@/lib/interviews/claude-interviewer";
import { analyzeResponse } from "@/lib/interviews/response-analyzer";

const START_TOKEN = "[START_INTERVIEW]";

const bodySchema = z.object({
  content: z.string().min(1),
  questionNumber: z.number().int().min(0).default(0),
  role: z.string().default("Software Engineer"),
  interviewType: z
    .enum(["technical", "behavioral", "system_design", "dsa"])
    .default("technical"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  totalQuestions: z.number().int().min(1).default(8),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req as AuthenticatedRequest, async (authedReq) => {
    try {
      const candidateId = authedReq.user!.candidateId;
      if (!candidateId) {
        return NextResponse.json(
          { error: "No candidate profile" },
          { status: 400 },
        );
      }

      const { id } = await params;
      const body = await authedReq.json().catch(() => ({}));
      const {
        content,
        questionNumber,
        role,
        interviewType,
        difficulty,
        totalQuestions,
      } = bodySchema.parse(body);

      const session = await prisma.interviewSession.findFirst({
        where: { id, candidateId },
      });

      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }
      if (session.status === "completed" || session.status === "abandoned") {
        return NextResponse.json(
          { error: "Session is no longer active" },
          { status: 409 },
        );
      }

      const history = await prisma.interviewMessage.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: "asc" },
      });

      const isFirstTurn = content === START_TOKEN;
      let candidateMessageId: string | null = null;

      if (!isFirstTurn) {
        const candidateMsg = await prisma.interviewMessage.create({
          data: {
            sessionId: id,
            role: "candidate",
            content,
          },
        });
        candidateMessageId = candidateMsg.id;
        history.push(candidateMsg);
      }

      const nextQuestionNumber = isFirstTurn ? 1 : questionNumber + 1;
      const isComplete = nextQuestionNumber > totalQuestions;

      const context = await buildInterviewContext({
        candidateId,
        history,
        questionNumber: Math.min(nextQuestionNumber, totalQuestions),
        role,
        interviewType,
        difficulty,
        totalQuestions,
      });

      const aiMessage = await getInterviewerResponse(context);

      const aiMsg = await prisma.interviewMessage.create({
        data: {
          sessionId: id,
          role: "interviewer",
          content: aiMessage,
        },
      });

      if (candidateMessageId && !isFirstTurn) {
        const lastInterviewerMsg = [...history]
          .reverse()
          .find((m) => m.role === "interviewer");
        if (lastInterviewerMsg) {
          analyzeResponse({
            sessionId: id,
            messageId: candidateMessageId,
            questionText: lastInterviewerMsg.content,
            answerText: content,
            role,
            interviewType,
          }).catch((err) => console.error("analyzeResponse failed", err));
        }
      }

      return NextResponse.json({
        message: {
          id: aiMsg.id,
          role: "interviewer" as const,
          content: aiMessage,
          questionNumber: Math.min(nextQuestionNumber, totalQuestions),
          createdAt: aiMsg.createdAt,
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
  });
}
