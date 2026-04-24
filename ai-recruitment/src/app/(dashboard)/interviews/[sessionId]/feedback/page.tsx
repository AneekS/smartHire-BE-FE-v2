"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDashboard } from "@/components/interviews/FeedbackDashboard";
import { useInterviewFeedback } from "@/hooks/useInterview";

export default function InterviewFeedbackPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { data, isLoading, error } = useInterviewFeedback(sessionId);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
          <Link href="/interviews">
            <ArrowLeft className="size-4" />
            All interviews
          </Link>
        </Button>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          Interview feedback
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
          How you did
        </h1>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          We couldn&apos;t load this report:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      <FeedbackDashboard data={data} isLoading={isLoading} />
    </div>
  );
}
