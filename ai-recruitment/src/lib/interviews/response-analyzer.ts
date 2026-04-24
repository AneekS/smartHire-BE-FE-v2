import { z } from "zod";
import { insforge } from "@/lib/insforge";
import type { InsForgeClient } from "@insforge/sdk";
import { extractFirstJsonObject } from "./json";
import type { InterviewType } from "./types";

const ANALYZER_MODEL = "anthropic/claude-sonnet-4.5";

const EvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string(),
  keywords_matched: z.array(z.string()).default([]),
  areas_to_improve: z.array(z.string()).default([]),
});

export type AnalyzerResult = z.infer<typeof EvaluationSchema>;

export interface AnalyzeInput {
  client: InsForgeClient;
  sessionId: string;
  messageId: string;
  questionText: string;
  answerText: string;
  role: string;
  interviewType: InterviewType;
}

export async function analyzeResponse(input: AnalyzeInput): Promise<AnalyzerResult | null> {
  if (!input.questionText.trim() || !input.answerText.trim()) return null;

  const prompt = `You are an expert technical interview evaluator. Score this single candidate answer in a ${input.interviewType.replace("_", " ")} interview for the role of ${input.role}.

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
    completion = await insforge.ai.chat.completions.create({
      model: ANALYZER_MODEL,
      temperature: 0.2,
      maxTokens: 500,
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
  const insertRes = await input.client.database.from("interview_evaluations").insert({
    session_id: input.sessionId,
    message_id: input.messageId,
    question_text: input.questionText,
    answer_text: input.answerText,
    score: evaluation.score,
    feedback: evaluation.feedback,
    keywords_matched: evaluation.keywords_matched,
    areas_to_improve: evaluation.areas_to_improve,
  });

  if (insertRes.error) {
    console.error("analyzeResponse: failed to persist evaluation", insertRes.error);
  }

  return evaluation;
}
