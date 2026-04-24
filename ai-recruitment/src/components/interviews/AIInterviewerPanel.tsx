"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThinkingIndicator } from "./ThinkingIndicator";

interface Props {
  currentMessage: string;
  isThinking: boolean;
  role?: string;
  questionNumber: number;
  totalQuestions: number;
}

export function AIInterviewerPanel({
  currentMessage,
  isThinking,
  role,
  questionNumber,
  totalQuestions,
}: Props) {
  return (
    <aside className="relative hidden w-80 shrink-0 flex-col gap-6 border-r border-border bg-card/80 p-6 lg:flex">
      <div className="relative mx-auto">
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-[radial-gradient(circle_at_center,var(--color-primary)/0.25,transparent_65%)]",
            isThinking ? "animate-pulse" : "animate-none",
          )}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full border border-primary/20"
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full border border-primary/10",
            isThinking && "motion-safe:animate-ping",
          )}
          style={{ animationDuration: "2.4s" }}
        />
        <motion.div
          animate={isThinking ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ repeat: isThinking ? Infinity : 0, duration: 1.8 }}
          className="relative size-28 select-none rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-xl shadow-primary/25 ring-4 ring-primary/10"
        >
          <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-light text-primary-foreground tracking-wider">
            Ax
          </div>
          <div className="absolute -bottom-1 right-2 flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium shadow ring-1 ring-border">
            <span
              className={cn(
                "inline-flex h-1.5 w-1.5 rounded-full",
                isThinking ? "bg-amber-500" : "bg-emerald-500",
              )}
            />
            {isThinking ? "Thinking" : "Listening"}
          </div>
        </motion.div>
      </div>

      <div className="text-center">
        <p className="font-display text-base font-semibold text-foreground">
          Alex
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Senior AI Interviewer{role ? ` · ${role}` : ""}
        </p>
      </div>

      {totalQuestions > 0 && (
        <div className="rounded-2xl bg-background/80 p-3 ring-1 ring-inset ring-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium tabular-nums text-foreground">
              {Math.min(questionNumber, totalQuestions)} / {totalQuestions}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  totalQuestions > 0
                    ? (Math.min(questionNumber, totalQuestions) / totalQuestions) * 100
                    : 0,
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative rounded-2xl bg-background p-4 text-sm leading-relaxed text-foreground ring-1 ring-inset ring-border",
          "before:absolute before:-top-1.5 before:left-8 before:block before:size-3 before:rotate-45 before:bg-background before:ring-1 before:ring-inset before:ring-border",
        )}
      >
        {isThinking ? (
          <ThinkingIndicator label="Alex is thinking…" />
        ) : currentMessage ? (
          <p className="whitespace-pre-wrap text-[13px]">{currentMessage}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Alex will greet you and ask the first question in a moment.
          </p>
        )}
      </div>
    </aside>
  );
}
