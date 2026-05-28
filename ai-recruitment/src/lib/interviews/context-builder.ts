import { prisma } from "@/lib/db";
import type {
  ChatTurn,
  InterviewContext,
  InterviewDifficulty,
  InterviewType,
} from "./types";

interface BuildInput {
  candidateId: string;
  history: { role: string; content: string }[];
  questionNumber: number;
  role: string;
  interviewType: string;
  difficulty: string;
  totalQuestions: number;
}

export async function loadCandidateProfile(
  candidateId: string,
): Promise<{ name: string; skills: string[]; resumeHighlights?: string }> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      name: true,
      email: true,
      headline: true,
      candidateSkills: { select: { name: true }, take: 20 },
    },
  });

  const skills = (candidate?.candidateSkills ?? [])
    .map((s) => s.name)
    .filter(Boolean);

  const fallbackName = (candidate?.email ?? "Candidate").split("@")[0];
  return {
    name: candidate?.name ?? fallbackName,
    skills,
    resumeHighlights: candidate?.headline ?? undefined,
  };
}

export function messagesToChatTurns(
  history: { role: string; content: string }[],
): ChatTurn[] {
  return history.map((m) => ({
    role: m.role === "interviewer" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));
}

export async function buildInterviewContext({
  candidateId,
  history,
  questionNumber,
  role,
  interviewType,
  difficulty,
  totalQuestions,
}: BuildInput): Promise<InterviewContext> {
  const profile = await loadCandidateProfile(candidateId);
  return {
    role,
    interviewType: interviewType as InterviewType,
    difficulty: difficulty as InterviewDifficulty,
    candidateName: profile.name,
    candidateSkills: profile.skills,
    resumeHighlights: profile.resumeHighlights,
    questionNumber,
    totalQuestions,
    conversationHistory: messagesToChatTurns(history),
  };
}
