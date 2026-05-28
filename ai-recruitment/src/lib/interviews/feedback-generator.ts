import { z } from "zod";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { extractFirstJsonObject } from "./json";

const openai = new OpenAI();

const FEEDBACK_MODEL = "gpt-4o-mini";

const FeedbackSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  technical_score: z.number().int().min(0).max(100),
  communication_score: z.number().int().min(0).max(100),
  depth_score: z.number().int().min(0).max(100),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  recommended_resources: z.array(z.string()).default([]),
  summary: z.string(),
});

export type FeedbackReport = z.infer<typeof FeedbackSchema>;

export async function generateFeedbackReport(
  sessionId: string,
): Promise<FeedbackReport | null> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  const messages = await prisma.interviewMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length === 0) return null;

  const transcript = messages
    .map(
      (m) =>
        `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`,
    )
    .join("\n\n");

  const prompt = `You are an expert interview evaluator. Analyze this interview transcript.

TRANSCRIPT:
${transcript}

Provide a JSON evaluation with this exact structure and keys (no prose, no code fences):
{
  "overall_score": <0-100>,
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "depth_score": <0-100>,
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "recommended_resources": ["...", "..."],
  "summary": "<3-4 sentence overall assessment>"
}`;

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: FEEDBACK_MODEL,
      temperature: 0.2,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("generateFeedbackReport: model call failed", err);
    return null;
  }

  const json = extractFirstJsonObject(raw);
  const parsed = FeedbackSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(
      "generateFeedbackReport: schema mismatch",
      parsed.error.issues,
    );
    return null;
  }

  const feedback = parsed.data;

  await prisma.interviewFeedback.upsert({
    where: { sessionId },
    create: {
      sessionId,
      summary: JSON.stringify({
        technicalScore: feedback.technical_score,
        communicationScore: feedback.communication_score,
        depthScore: feedback.depth_score,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        recommendedResources: feedback.recommended_resources,
        summary: feedback.summary,
      }),
      score: feedback.overall_score,
    },
    update: {
      summary: JSON.stringify({
        technicalScore: feedback.technical_score,
        communicationScore: feedback.communication_score,
        depthScore: feedback.depth_score,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        recommendedResources: feedback.recommended_resources,
        summary: feedback.summary,
      }),
      score: feedback.overall_score,
    },
  });

  return feedback;
}
