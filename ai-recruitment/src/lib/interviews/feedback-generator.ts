import { z } from "zod";
import type { InsForgeClient } from "@insforge/sdk";
import { insforge } from "@/lib/insforge";
import { extractFirstJsonObject } from "./json";
import type { InterviewMessageRow, InterviewSessionRow } from "./types";

const FEEDBACK_MODEL = "anthropic/claude-sonnet-4.5";

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
  client: InsForgeClient,
  sessionId: string,
): Promise<FeedbackReport | null> {
  const sessionRes = await client.database
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  const session = sessionRes.data as InterviewSessionRow | null;
  if (!session) return null;

  const messagesRes = await client.database
    .from("interview_messages")
    .select("role, content, question_number, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const messages = (messagesRes.data ?? []) as Pick<
    InterviewMessageRow,
    "role" | "content" | "question_number" | "created_at"
  >[];

  if (messages.length === 0) return null;

  const transcript = messages
    .map((m) =>
      `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`,
    )
    .join("\n\n");

  const prompt = `You are an expert interview evaluator. Analyze this ${session.interview_type.replace(
    "_",
    " ",
  )} interview transcript for the role of ${session.role} at ${session.difficulty} difficulty.

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
    const completion = await insforge.ai.chat.completions.create({
      model: FEEDBACK_MODEL,
      temperature: 0.2,
      maxTokens: 1500,
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
    console.warn("generateFeedbackReport: schema mismatch", parsed.error.issues);
    return null;
  }

  const feedback = parsed.data;

  await client.database
    .from("interview_feedback")
    .upsert(
      {
        session_id: sessionId,
        overall_score: feedback.overall_score,
        technical_score: feedback.technical_score,
        communication_score: feedback.communication_score,
        depth_score: feedback.depth_score,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        recommended_resources: feedback.recommended_resources,
        summary: feedback.summary,
      },
      { onConflict: "session_id" },
    );

  await client.database
    .from("interview_sessions")
    .update({ overall_score: feedback.overall_score })
    .eq("id", sessionId);

  return feedback;
}
