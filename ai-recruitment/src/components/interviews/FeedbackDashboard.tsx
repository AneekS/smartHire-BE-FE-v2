"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  InterviewFeedbackResponse,
  InterviewSession,
} from "@/lib/api-client";
import { SessionScoreBadge } from "./SessionScoreBadge";

interface Props {
  data?: InterviewFeedbackResponse;
  isLoading: boolean;
}

function pct(score: number | null | undefined) {
  if (score == null) return 0;
  return Math.max(0, Math.min(100, score));
}

export function FeedbackDashboard({ data, isLoading }: Props) {
  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { session, feedback, status } = data;

  if (status === "generating" || !feedback) {
    return <GeneratingState session={session as InterviewSession} />;
  }

  const scoreBreakdown = [
    { label: "Technical", value: feedback.technicalScore },
    { label: "Communication", value: feedback.communicationScore },
    { label: "Depth", value: feedback.depthScore },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" />
              Session report
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">
              {session.role}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.interviewType.replace("_", " ")} · {session.difficulty} ·{" "}
              {session.durationMinutes} min
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80">
              {feedback.summary}
            </p>
          </div>

          <div className="flex items-center gap-4 sm:shrink-0">
            <ScoreRing score={feedback.overallScore ?? 0} />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Overall
              </div>
              <div className="font-display text-3xl font-semibold text-foreground tabular-nums">
                {feedback.overallScore ?? "—"}
              </div>
              <SessionScoreBadge score={feedback.overallScore ?? null} className="mt-1" />
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-3">
        {scoreBreakdown.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-semibold text-foreground tabular-nums">
                {item.value ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct(item.value) >= 70
                    ? "bg-emerald-500"
                    : pct(item.value) >= 55
                      ? "bg-amber-500"
                      : "bg-rose-500",
                )}
                style={{ width: `${pct(item.value)}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InsightList
          icon={<CheckCircle2 className="size-4" />}
          title="Strengths"
          tone="positive"
          items={feedback.strengths}
        />
        <InsightList
          icon={<AlertTriangle className="size-4" />}
          title="Areas to improve"
          tone="warning"
          items={feedback.improvements}
        />
      </div>

      {feedback.recommendedResources.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="size-4 text-muted-foreground" />
            Recommended next steps
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {feedback.recommendedResources.map((res) => (
              <li
                key={res}
                className="rounded-2xl border border-border bg-background/40 p-3 text-sm text-foreground"
              >
                {res}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/interviews">
            <ArrowLeft className="size-4" />
            Back to interviews
          </Link>
        </Button>
        <Button asChild>
          <Link href="/interviews">Start a new session</Link>
        </Button>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const clamped = pct(score);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative size-24">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} strokeWidth="8" className="fill-none stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="8"
          strokeLinecap="round"
          className="fill-none stroke-primary transition-all duration-700"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-semibold tabular-nums">
        {Math.round(clamped)}%
      </div>
    </div>
  );
}

function InsightList({
  icon,
  title,
  tone,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "positive" | "warning";
  items: string[];
}) {
  const toneClasses =
    tone === "positive"
      ? "bg-emerald-500/5 text-emerald-700"
      : "bg-amber-500/5 text-amber-700";

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
          toneClasses,
        )}
      >
        {icon}
        {title}
      </div>
      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">No specific items noted.</li>
        ) : (
          items.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-border bg-background/40 p-3 text-sm leading-relaxed text-foreground"
            >
              {item}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function GeneratingState({ session }: { session: InterviewSession }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <div className="relative">
        <div className="size-14 rounded-full bg-primary/10 ring-4 ring-primary/5" />
        <div className="absolute inset-0 size-14 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        Preparing your feedback
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        We&apos;re analyzing your {session.interviewType.replace("_", " ")} interview for{" "}
        {session.role}. This usually takes under a minute.
      </p>
    </div>
  );
}
