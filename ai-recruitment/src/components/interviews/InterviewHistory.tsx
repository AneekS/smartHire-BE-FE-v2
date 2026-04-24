"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useInterviewHistory } from "@/hooks/useInterview";
import { SessionScoreBadge } from "./SessionScoreBadge";

function typeLabel(type: string) {
  return type.replace("_", " ");
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "active":
      return "In progress";
    case "abandoned":
      return "Abandoned";
    default:
      return "Setup";
  }
}

export function InterviewHistory() {
  const { sessions, isLoading } = useInterviewHistory();

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">
            Recent sessions
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick up where you left off or review feedback.
          </p>
        </div>
        <MessageCircle className="size-4 text-muted-foreground" />
      </header>

      <div className="mt-4 space-y-2">
        {isLoading && (
          <>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-background/40 p-5 text-center text-sm text-muted-foreground">
            No sessions yet. Start one to see your history here.
          </div>
        )}

        {!isLoading &&
          sessions.map((session) => {
            const hasFeedback = session.status === "completed";
            const destination = hasFeedback
              ? `/interviews/${session.id}/feedback`
              : `/interviews/${session.id}`;
            return (
              <Link
                key={session.id}
                href={destination}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3 transition-all hover:border-primary/40 hover:bg-background",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {session.role}
                    </p>
                    <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {typeLabel(session.interviewType)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {session.createdAt
                        ? formatDistanceToNow(new Date(session.createdAt), {
                            addSuffix: true,
                          })
                        : "just now"}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="capitalize">{session.difficulty}</span>
                    <span aria-hidden>·</span>
                    <span>{statusBadge(session.status)}</span>
                  </div>
                </div>
                <SessionScoreBadge score={session.overallScore} />
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
      </div>
    </section>
  );
}
