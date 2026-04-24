"use client";

import { Timer, LogOut, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InterviewSession } from "@/lib/api-client";

interface Props {
  session: InterviewSession | null;
  formattedTime: string;
  overLimit?: boolean;
  questionNumber: number;
  totalQuestions: number;
  ttsEnabled: boolean;
  ttsSupported: boolean;
  onToggleTTS: () => void;
  onEnd: () => void;
  isEnding: boolean;
}

export function InterviewRoomHeader({
  session,
  formattedTime,
  overLimit,
  questionNumber,
  totalQuestions,
  ttsEnabled,
  ttsSupported,
  onToggleTTS,
  onEnd,
  isEnding,
}: Props) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 sm:flex">
          <Timer className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-foreground">
            {session?.role ?? "Mock Interview"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session ? `${session.interviewType.replace("_", " ")} · ${session.difficulty}` : "Warming up"}
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-4 md:flex">
        <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium tabular-nums",
            overLimit ? "text-amber-600" : "text-foreground",
          )}
          aria-live="polite"
        >
          <Timer className="size-3.5" />
          {formattedTime}
        </div>
        {totalQuestions > 0 && (
          <div className="text-xs font-medium text-muted-foreground">
            Question {Math.min(questionNumber, totalQuestions)} of {totalQuestions}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTTS}
          disabled={!ttsSupported}
          aria-pressed={ttsEnabled}
          aria-label={ttsEnabled ? "Mute interviewer voice" : "Play interviewer voice"}
          className="gap-2"
        >
          {ttsEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          <span className="hidden sm:inline">{ttsEnabled ? "Voice on" : "Voice off"}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEnd}
          disabled={isEnding}
          className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">End interview</span>
        </Button>
      </div>
    </header>
  );
}
