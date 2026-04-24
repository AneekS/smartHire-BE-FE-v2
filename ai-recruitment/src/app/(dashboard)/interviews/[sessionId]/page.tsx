"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInterviewerPanel } from "@/components/interviews/AIInterviewerPanel";
import { CandidateResponsePanel } from "@/components/interviews/CandidateResponsePanel";
import { InterviewRoomHeader } from "@/components/interviews/InterviewRoomHeader";
import { useInterviewRoom } from "@/hooks/useInterview";
import { useInterviewTimer } from "@/hooks/useInterviewTimer";
import { useTTS } from "@/hooks/useTTS";

export default function InterviewRoomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();

  const {
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
  } = useInterviewRoom(sessionId);

  const { formattedTime, overLimit } = useInterviewTimer({
    startedAt: session?.startedAt,
    durationMinutes: session?.durationMinutes,
    running: !isComplete,
  });

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const { speak, isSupported: ttsSupported } = useTTS({ enabled: ttsEnabled });

  const latestInterviewerMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "interviewer") return messages[i];
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!ttsEnabled || !latestInterviewerMessage) return;
    speak(latestInterviewerMessage.content);
  }, [latestInterviewerMessage, ttsEnabled, speak]);

  useEffect(() => {
    if (isComplete && !isEnding) {
      const id = window.setTimeout(() => {
        router.push(`/interviews/${sessionId}/feedback`);
      }, 1800);
      return () => window.clearTimeout(id);
    }
  }, [isComplete, isEnding, router, sessionId]);

  async function handleEnd() {
    try {
      await endSession();
      router.push(`/interviews/${sessionId}/feedback`);
    } catch {
      // toast surfaces the error
    }
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto size-6 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-semibold text-foreground">
            We couldn&apos;t load this interview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.push("/interviews")}>
            Back to interviews
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingSession && !session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading interview room…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-[600px] flex-col bg-background">
      <InterviewRoomHeader
        session={session}
        formattedTime={formattedTime}
        overLimit={overLimit}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        ttsEnabled={ttsEnabled}
        ttsSupported={ttsSupported}
        onToggleTTS={() => setTtsEnabled((v) => !v)}
        onEnd={handleEnd}
        isEnding={isEnding}
      />

      <div className="flex min-h-0 flex-1">
        <AIInterviewerPanel
          currentMessage={latestInterviewerMessage?.content ?? ""}
          isThinking={isAiThinking}
          role={session?.role}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
        <CandidateResponsePanel
          messages={messages}
          onSend={sendMessage}
          disabled={isLoadingSession}
          isAiThinking={isAiThinking}
          isComplete={isComplete}
        />
      </div>
    </div>
  );
}
