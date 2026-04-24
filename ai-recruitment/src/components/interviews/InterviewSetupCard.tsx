"use client";

import { useState } from "react";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  CreateInterviewInput,
  InterviewDifficulty,
  InterviewType,
} from "@/lib/api-client";

const ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Developer",
  "System Design Engineer",
  "Data Scientist",
  "ML Engineer",
  "Product Manager",
  "DevOps Engineer",
  "Mobile Engineer",
];

const INTERVIEW_TYPES: Array<{
  id: InterviewType;
  label: string;
  description: string;
}> = [
  { id: "technical", label: "Technical", description: "Coding depth and concepts" },
  { id: "behavioral", label: "Behavioral", description: "STAR stories and soft skills" },
  { id: "system_design", label: "System Design", description: "Architecture and scale" },
  { id: "dsa", label: "DSA", description: "Algorithms and data structures" },
];

const DIFFICULTIES: InterviewDifficulty[] = ["easy", "medium", "hard"];
const DURATIONS = [15, 30, 45, 60];

interface Props {
  defaultRole?: string;
  onStart: (input: CreateInterviewInput) => void;
  isLoading: boolean;
}

export function InterviewSetupCard({ defaultRole, onStart, isLoading }: Props) {
  const [role, setRole] = useState(defaultRole ?? ROLES[0]);
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("medium");
  const [durationMinutes, setDurationMinutes] = useState(45);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            AI Mock Interview Room
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            A one-on-one session with Alex, an AI interviewer who adapts to your role,
            background, and answers in real time.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Target role">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Target role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Difficulty">
          <SegmentedControl
            value={difficulty}
            options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
            onChange={(v) => setDifficulty(v as InterviewDifficulty)}
            capitalize
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Interview type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {INTERVIEW_TYPES.map((t) => {
              const isActive = interviewType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setInterviewType(t.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "group rounded-2xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                    isActive
                      ? "border-primary/60 bg-primary/5 ring-1 ring-inset ring-primary/20"
                      : "border-border bg-background hover:border-primary/30",
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      isActive ? "text-primary" : "text-foreground",
                    )}
                  >
                    {t.label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.description}
                  </div>
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Duration">
          <SegmentedControl
            value={String(durationMinutes)}
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d} min` }))}
            onChange={(v) => setDurationMinutes(Number(v))}
          />
        </Field>
      </div>

      <div className="mt-8">
        <Button
          size="lg"
          className="h-12 w-full gap-2 rounded-2xl text-base font-semibold"
          disabled={isLoading}
          onClick={() =>
            onStart({ role, interviewType, difficulty, durationMinutes })
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Setting up your interview…
            </>
          ) : (
            <>
              <Mic className="size-4" />
              Start mock interview
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          We&apos;ll ask questions tailored to your resume and scoring rubric.
        </p>
      </div>
    </motion.section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
  capitalize,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  capitalize?: boolean;
}) {
  return (
    <div className="inline-flex w-full gap-1 rounded-2xl border border-border bg-background p-1">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
              capitalize && "capitalize",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
