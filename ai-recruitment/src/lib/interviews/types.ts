export type InterviewType = "technical" | "behavioral" | "system_design" | "dsa";
export type InterviewDifficulty = "easy" | "medium" | "hard";
export type InterviewStatus = "setup" | "active" | "completed" | "abandoned";
export type TranscriptRole = "interviewer" | "candidate";

export interface InterviewSessionRow {
  id: string;
  user_id: string;
  role: string;
  interview_type: InterviewType;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  duration_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  overall_score: number | null;
  created_at: string;
}

export interface InterviewMessageRow {
  id: string;
  session_id: string;
  role: TranscriptRole;
  content: string;
  question_number: number | null;
  created_at: string;
}

export interface InterviewFeedbackRow {
  id: string;
  session_id: string;
  overall_score: number | null;
  technical_score: number | null;
  communication_score: number | null;
  depth_score: number | null;
  strengths: string[] | null;
  improvements: string[] | null;
  recommended_resources: string[] | null;
  summary: string | null;
  created_at: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface InterviewContext {
  role: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  candidateName: string;
  candidateSkills: string[];
  resumeHighlights?: string;
  questionNumber: number;
  totalQuestions: number;
  conversationHistory: ChatTurn[];
}

export function totalQuestionsFor(durationMinutes: number): number {
  return Math.max(3, Math.round((durationMinutes / 45) * 8));
}
