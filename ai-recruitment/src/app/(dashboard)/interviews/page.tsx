"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Compass, Gauge } from "lucide-react";
import { InterviewSetupCard } from "@/components/interviews/InterviewSetupCard";
import { InterviewHistory } from "@/components/interviews/InterviewHistory";
import { useCreateInterview, useInterviewHistory } from "@/hooks/useInterview";
import type { CreateInterviewInput } from "@/lib/api-client";

export default function InterviewsPage() {
  const router = useRouter();
  const { create, isCreating } = useCreateInterview();
  const { sessions, mutate } = useInterviewHistory();

  const completed = sessions.filter((s) => s.status === "completed");
  const averageScore = completed.length
    ? Math.round(
        completed.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / completed.length,
      )
    : null;

  async function handleStart(input: CreateInterviewInput) {
    const session = await create(input);
    await mutate();
    router.push(`/interviews/${session.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          Mock interviews
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
          Practice real interviews, get instant feedback
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Configure a role, difficulty, and format. Alex will lead a live conversation
          and deliver a structured scorecard the moment you&apos;re done.
        </p>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <InterviewSetupCard onStart={handleStart} isLoading={isCreating} />

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Brain className="size-4" />}
              label="Sessions"
              value={sessions.length.toString()}
            />
            <StatCard
              icon={<Gauge className="size-4" />}
              label="Avg score"
              value={averageScore == null ? "—" : `${averageScore}`}
            />
            <StatCard
              icon={<Compass className="size-4" />}
              label="Completed"
              value={completed.length.toString()}
            />
          </div>
        </div>

        <InterviewHistory />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}
