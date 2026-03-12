"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Eye,
  FileSearch,
  UserCheck,
  Calendar,
  CheckCircle2,
  Gift,
  XCircle,
  Trophy,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrackerApplicationStatus } from "@/lib/api-client";

const STATUS_CONFIG: Record<
  TrackerApplicationStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  APPLIED: {
    label: "Applied",
    icon: Briefcase,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  RESUME_VIEWED: {
    label: "Resume Viewed",
    icon: Eye,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    icon: FileSearch,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    icon: UserCheck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  INTERVIEW_SCHEDULED: {
    label: "Interview Scheduled",
    icon: Calendar,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  INTERVIEW_COMPLETED: {
    label: "Interview Completed",
    icon: CheckCircle2,
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
  },
  OFFER: {
    label: "Offer",
    icon: Gift,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/30",
  },
  HIRED: {
    label: "Hired",
    icon: Trophy,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    icon: LogOut,
    color: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-800/30",
  },
};

export function getStatusConfig(status: TrackerApplicationStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.APPLIED;
}

// ─── Status Badge ────────────────────────────────────────────────────────

export function ApplicationStatusBadge({
  status,
  size = "default",
}: {
  status: TrackerApplicationStatus;
  size?: "default" | "sm" | "lg";
}) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        "font-semibold border-0 gap-1.5",
        config.bgColor,
        config.color,
        size === "sm" && "text-[10px] px-2 py-0.5",
        size === "lg" && "text-sm px-3 py-1.5"
      )}
    >
      <Icon className={cn("w-3 h-3", size === "lg" && "w-4 h-4")} />
      {config.label}
    </Badge>
  );
}

// ─── Health Score Indicator ──────────────────────────────────────────────

export function HealthScoreIndicator({
  score,
  size = "default",
}: {
  score: number | null;
  size?: "default" | "sm" | "lg";
}) {
  const value = score ?? 0;
  const color =
    value >= 75
      ? "text-emerald-600"
      : value >= 50
        ? "text-amber-500"
        : "text-red-500";
  const bgColor =
    value >= 75
      ? "stroke-emerald-500"
      : value >= 50
        ? "stroke-amber-400"
        : "stroke-red-400";

  const radius = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const stroke = size === "sm" ? 3 : size === "lg" ? 4 : 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={(radius + stroke) * 2}
        height={(radius + stroke) * 2}
        className="-rotate-90"
      >
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200 dark:text-slate-700"
        />
        <motion.circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={bgColor}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span
        className={cn(
          "absolute font-bold",
          color,
          size === "sm" && "text-[10px]",
          size === "lg" && "text-base",
          size === "default" && "text-xs"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Interview Probability Badge ─────────────────────────────────────────

export function InterviewProbabilityBadge({
  probability,
}: {
  probability: number | null;
}) {
  const value = probability ?? 0;
  const color =
    value >= 70
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
      : value >= 40
        ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
        : "text-red-500 bg-red-50 dark:bg-red-950/30";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
        color
      )}
    >
      {value}% interview
    </span>
  );
}

// ─── Pipeline Stage ──────────────────────────────────────────────────────

const PIPELINE_STAGES: TrackerApplicationStatus[] = [
  "APPLIED",
  "RESUME_VIEWED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "OFFER",
  "HIRED",
];

export function ApplicationPipeline({
  currentStatus,
}: {
  currentStatus: TrackerApplicationStatus;
}) {
  const isTerminal = currentStatus === "REJECTED" || currentStatus === "WITHDRAWN";
  const currentIndex = PIPELINE_STAGES.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {PIPELINE_STAGES.map((stage, i) => {
        const config = getStatusConfig(stage);
        const Icon = config.icon;
        const isPast = !isTerminal && i < currentIndex;
        const isCurrent = stage === currentStatus;
        const isFuture = !isTerminal && i > currentIndex;

        return (
          <div key={stage} className="flex items-center gap-1 flex-shrink-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                isCurrent && cn(config.bgColor, config.color, "ring-2 ring-offset-1", `ring-current`),
                isPast && "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600",
                isFuture && "bg-slate-100 dark:bg-slate-800 text-slate-400",
                isTerminal && !isCurrent && "bg-slate-100 dark:bg-slate-800 text-slate-300"
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{config.label}</span>
            </motion.div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div
                className={cn(
                  "w-4 h-0.5 rounded-full flex-shrink-0",
                  isPast
                    ? "bg-emerald-400"
                    : "bg-slate-200 dark:bg-slate-700"
                )}
              />
            )}
          </div>
        );
      })}
      {isTerminal && (
        <>
          <div className="w-4 h-0.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <ApplicationStatusBadge status={currentStatus} size="sm" />
        </>
      )}
    </div>
  );
}
