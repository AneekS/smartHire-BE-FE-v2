"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CompletenessBarProps {
  score:    number;
  missing?: string[];
  compact?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600" };
  if (score >= 60) return { bar: "bg-blue-500",   text: "text-blue-600"   };
  if (score >= 40) return { bar: "bg-amber-500",  text: "text-amber-600"  };
  return               { bar: "bg-red-500",    text: "text-red-600"    };
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Strong Profile";
  if (score >= 60) return "Good Progress";
  if (score >= 40) return "Getting Started";
  return "Needs Attention";
}

const SECTION_LABELS: Record<string, string> = {
  name:        "Name",
  headline:    "Headline",
  education:   "Education",
  skills:      "Skills (3+)",
  resume:      "Resume",
  projects:    "Projects",
  experience:  "Experience",
  careerPrefs: "Career Prefs",
};

export function CompletenessBar({ score, missing = [], compact = false }: CompletenessBarProps) {
  const colors = getScoreColor(score);

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          <span>Profile Completeness</span>
          <span className={cn("font-black", colors.text)}>{score}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <motion.div
            className={cn("h-full rounded-full transition-all", colors.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] mt-1.5 font-semibold text-slate-400">{getScoreLabel(score)}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <span className={cn("text-4xl font-black tabular-nums", colors.text)}>{score}</span>
          <span className="text-slate-400 font-semibold text-lg ml-1">/ 100</span>
        </div>
        <span className={cn("text-sm font-bold px-3 py-1 rounded-full", colors.text,
          score >= 80 ? "bg-emerald-50" : score >= 60 ? "bg-blue-50" : score >= 40 ? "bg-amber-50" : "bg-red-50"
        )}>
          {getScoreLabel(score)}
        </span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <motion.div
          className={cn("h-full rounded-full", colors.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      {missing.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Complete these to boost your score:</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((key) => (
              <span key={key} className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-[11px] font-medium text-slate-400 dark:border-slate-600">
                + {SECTION_LABELS[key] ?? key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
