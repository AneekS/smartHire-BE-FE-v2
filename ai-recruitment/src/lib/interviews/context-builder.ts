import type { InsForgeClient } from "@insforge/sdk";
import type {
  ChatTurn,
  InterviewContext,
  InterviewMessageRow,
  InterviewSessionRow,
} from "./types";
import { totalQuestionsFor } from "./types";

interface BuildInput {
  client: InsForgeClient;
  userId: string;
  session: InterviewSessionRow;
  history: Pick<InterviewMessageRow, "role" | "content">[];
  questionNumber: number;
}

export async function loadCandidateProfile(
  client: InsForgeClient,
  userId: string,
): Promise<{ name: string; skills: string[]; resumeHighlights?: string }> {
  const userRes = await client.database
    .from("User")
    .select("name, email, headline")
    .eq("id", userId)
    .maybeSingle();

  const authUser = userRes.data as
    | { name?: string; email?: string; headline?: string }
    | null;

  let skills: string[] = [];
  try {
    const skillsRes = await client.database
      .from("CandidateSkill")
      .select("name")
      .eq("candidateId", userId)
      .limit(20);
    const rows = (skillsRes.data ?? []) as { name?: string }[];
    skills = rows
      .map((row) => (typeof row.name === "string" ? row.name : null))
      .filter((n): n is string => Boolean(n));
  } catch {
    skills = [];
  }

  const fallbackName = (authUser?.email ?? "Candidate").split("@")[0];
  return {
    name: authUser?.name ?? fallbackName,
    skills,
    resumeHighlights: authUser?.headline ?? undefined,
  };
}

export function messagesToChatTurns(
  history: Pick<InterviewMessageRow, "role" | "content">[],
): ChatTurn[] {
  return history.map((m) => ({
    role: m.role === "interviewer" ? "assistant" : "user",
    content: m.content,
  }));
}

export async function buildInterviewContext({
  client,
  userId,
  session,
  history,
  questionNumber,
}: BuildInput): Promise<InterviewContext> {
  const profile = await loadCandidateProfile(client, userId);
  return {
    role: session.role,
    interviewType: session.interview_type,
    difficulty: session.difficulty,
    candidateName: profile.name,
    candidateSkills: profile.skills,
    resumeHighlights: profile.resumeHighlights,
    questionNumber,
    totalQuestions: totalQuestionsFor(session.duration_minutes),
    conversationHistory: messagesToChatTurns(history),
  };
}
