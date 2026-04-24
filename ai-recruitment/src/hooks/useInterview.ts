"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  interviewsApi,
  type CreateInterviewInput,
  type InterviewFeedbackResponse,
  type InterviewSession,
  type InterviewTranscriptMessage,
} from "@/lib/api-client";

const START_TOKEN = "[START_INTERVIEW]";

export function useInterviewHistory() {
  const { data, error, isLoading, mutate } = useSWR<InterviewSession[]>(
    "/api/interviews",
    () => interviewsApi.list(),
  );

  return {
    sessions: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useCreateInterview() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(async (input: CreateInterviewInput) => {
    setIsCreating(true);
    try {
      return await interviewsApi.create(input);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start interview");
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating };
}

export interface UseInterviewRoomState {
  session: InterviewSession | null;
  messages: InterviewTranscriptMessage[];
  questionNumber: number;
  totalQuestions: number;
  isLoadingSession: boolean;
  isAiThinking: boolean;
  isComplete: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  endSession: () => Promise<void>;
  isEnding: boolean;
}

export function useInterviewRoom(sessionId: string): UseInterviewRoomState {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<InterviewTranscriptMessage[]>([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const kickoffRef = useRef(false);

  const sendTurn = useCallback(
    async (content: string, currentQn: number) => {
      setIsAiThinking(true);
      try {
        const response = await interviewsApi.sendMessage(
          sessionId,
          content,
          currentQn,
        );
        setMessages((prev) => [
          ...prev,
          {
            id: response.message.id,
            sessionId,
            role: "interviewer",
            content: response.message.content,
            questionNumber: response.message.questionNumber,
            createdAt: response.message.createdAt,
          },
        ]);
        setQuestionNumber(response.questionNumber);
        if (response.isComplete) setIsComplete(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send message";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsAiThinking(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoadingSession(true);
      try {
        const { session: s, messages: msgs } = await interviewsApi.get(sessionId);
        if (cancelled) return;
        setSession(s);
        setMessages(msgs);
        const qn = msgs.filter((m) => m.role === "interviewer").length;
        setQuestionNumber(qn);
        if (s.status === "completed" || s.status === "abandoned") {
          setIsComplete(true);
        }
        setIsLoadingSession(false);

        // Kick off the interview with the AI's opening question if empty.
        if (msgs.length === 0 && !kickoffRef.current) {
          kickoffRef.current = true;
          await sendTurn(START_TOKEN, 0);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load session";
        setError(msg);
        setIsLoadingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, sendTurn]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isAiThinking || isComplete) return;

      const optimistic: InterviewTranscriptMessage = {
        id: `temp-${Date.now()}`,
        sessionId,
        role: "candidate",
        content: trimmed,
        questionNumber,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      await sendTurn(trimmed, questionNumber);
    },
    [isAiThinking, isComplete, questionNumber, sendTurn, sessionId],
  );

  const endSession = useCallback(async () => {
    setIsEnding(true);
    try {
      await interviewsApi.end(sessionId);
      setIsComplete(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end session");
      throw err;
    } finally {
      setIsEnding(false);
    }
  }, [sessionId]);

  const totalQuestions = session?.totalQuestions ?? 0;

  return {
    session,
    messages,
    questionNumber,
    totalQuestions,
    isLoadingSession,
    isAiThinking,
    isComplete,
    error,
    sendMessage,
    endSession,
    isEnding,
  };
}

export function useInterviewFeedback(sessionId: string) {
  const { data, error, isLoading, mutate } = useSWR<InterviewFeedbackResponse>(
    sessionId ? `/api/interviews/${sessionId}/feedback` : null,
    () => interviewsApi.feedback(sessionId),
    {
      refreshInterval: (latest) =>
        latest && latest.status === "generating" ? 3000 : 0,
    },
  );

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  };
}
