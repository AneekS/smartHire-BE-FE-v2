"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  interviewsApi,
  type InterviewSession,
} from "@/lib/api-client";
import { adaptInterview } from "@/lib/adapters";

export type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

export function useInterviews() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/interviews/mock",
    async () => {
      const raw = await interviewsApi.list();
      return raw.map((s) => adaptInterview(s as Record<string, unknown>));
    }
  );

  return {
    sessions: (data ?? []) as InterviewSession[],
    isLoading,
    error,
    mutate,
  };
}

export function useInterviewSession() {
  const { sessions, mutate } = useInterviews();
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [creating, setCreating] = useState(false);

  const startInterview = useCallback(
    async (targetRole = "Software Engineer", sessionType = "TECHNICAL") => {
      setCreating(true);
      try {
        const raw = await interviewsApi.start({
          target_role: targetRole,
          session_type: sessionType,
        });
        const session = adaptInterview(raw as Record<string, unknown>);
        setCurrentSession(session);
        setTranscript([]);
        await mutate();
        return session;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to start interview");
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [mutate]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!currentSession || streaming) return;

      const userMsg: Message = {
        id: `temp-${Date.now()}`,
        role: "USER",
        content: message,
        createdAt: new Date().toISOString(),
      };
      setTranscript((prev) => [...prev, userMsg]);
      setStreaming(true);

      const messagesForApi = transcript
        .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
        .map((m) => ({
          role: m.role.toLowerCase() as "user" | "assistant",
          content: m.content,
        }));
      messagesForApi.push({ role: "user" as const, content: message });

      let aiContent = "";

      try {
        await interviewsApi.streamMessage(
          currentSession.id,
          messagesForApi,
          currentSession.title,
          currentSession.type,
          (chunk) => {
            aiContent += chunk;
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "ASSISTANT") {
                return [...prev.slice(0, -1), { ...last, content: aiContent }];
              }
              return [
                ...prev,
                {
                  id: `ai-${Date.now()}`,
                  role: "ASSISTANT" as const,
                  content: aiContent,
                  createdAt: new Date().toISOString(),
                },
              ];
            });
          }
        );
        await mutate();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Send failed");
        setTranscript((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setStreaming(false);
      }
    },
    [currentSession, transcript, streaming, mutate]
  );

  const selectSession = useCallback((session: InterviewSession | null) => {
    setCurrentSession(session);
    setTranscript(
      (session?.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role as "USER" | "ASSISTANT",
        content: m.content,
        createdAt: m.createdAt ?? new Date().toISOString(),
      }))
    );
  }, []);

  return {
    sessions,
    currentSession,
    transcript,
    streaming,
    creating,
    startInterview,
    sendMessage,
    selectSession,
    mutate,
  };
}
