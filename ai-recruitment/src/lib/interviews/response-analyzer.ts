import { z } from "zod";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { extractFirstJsonObject } from "./json";

const openai = new OpenAI();

const ANALYZER_MODEL = "gpt-4o-mini";

const EvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string(),
  keywords_matched: z.array(z.string()).default([]),
  areas_to_improve: z.array(z.string()).default([]),
});

export type AnalyzerResult = z.infer<typeof EvaluationSchema>;

export interface AnalyzeInput {
  sessionId: string;
  messageId: string;
  questionText: string;
  answerText: string;
  role: string;
  interviewType: string;
}

export async function analyzeResponse(
  input: AnalyzeInput,
): Promise<AnalyzerResult | null> {
  if (!input.questionText.trim() || !input.answerText.trim()) return null;

  const typeLabel = input.interviewType.replace("_", " ");

  const prompt = `You are an expert technical interview evaluator. Score this single candidate answer in a ${typeLabel} interview for the role of ${input.role}.

QUESTION:
${input.questionText}

ANSWER:
${input.answerText}

Return ONLY a JSON object with this exact shape (no prose, no code fences):
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentences of concrete, actionable feedback>",
  "keywords_matched": ["..."],
  "areas_to_improve": ["..."]
}`;

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: ANALYZER_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    console.error("analyzeResponse: model call failed", err);
    return null;
  }

  const raw = completion.choices[0]?.message?.content ?? "";
  const parsedJson = extractFirstJsonObject(raw);
  if (!parsedJson) {
    console.warn("analyzeResponse: could not extract JSON from model output");
    return null;
  }

  const parsed = EvaluationSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.warn("analyzeResponse: JSON failed schema", parsed.error.issues);
    return null;
  }

  const evaluation = parsed.data;

  try {
    await prisma.interviewEvaluation.create({
      data: {
        sessionId: input.sessionId,
        questionId: input.messageId,
        answer: input.answerText,
        score: evaluation.score,
        feedback: evaluation.feedback,
      },
    });
  } catch (err) {
    console.error("analyzeResponse: failed to persist evaluation", err);
  }

  return evaluation;
}
