"use client";

import { Star, MessageSquare, CheckSquare, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReputationData } from "@/lib/api-client";

interface ReputationSectionProps {
  reputation?: ReputationData | null;
}

function MetricBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          {icon}
          {label}
        </div>
        <span className="text-xs font-bold text-slate-500">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ReputationSection({ reputation }: ReputationSectionProps) {
  if (!reputation) return null;

  const overall = Math.round((reputation.overallScore ?? 0) * 100);
  const badge    = overall >= 80 ? { label: "Elite Top 5%",  bg: "from-amber-400 to-orange-500" }
                 : overall >= 60 ? { label: "Top 10%",       bg: "from-violet-500 to-purple-600" }
                 : overall >= 40 ? { label: "Rising Star",   bg: "from-blue-500 to-cyan-500" }
                 :                 { label: "Member",         bg: "from-slate-400 to-slate-500" };

  return (
    <Card className="rounded-2xl border-slate-200/60 overflow-hidden dark:border-slate-800">
      <div className={cn("bg-gradient-to-r px-6 py-4 text-white", badge.bg)}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-black text-lg">{badge.label}</h4>
            <p className="text-sm text-white/80">Platform Reputation</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black tabular-nums">{overall}</div>
            <div className="text-xs text-white/70">/ 100</div>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <MetricBar
          label="Interview Performance"
          value={reputation.interviewPerformance ?? 0}
          icon={<Star className="h-3 w-3" />}
          color="bg-amber-400"
        />
        <MetricBar
          label="Recruiter Feedback"
          value={reputation.recruiterFeedback ?? 0}
          icon={<MessageSquare className="h-3 w-3" />}
          color="bg-violet-400"
        />
        <MetricBar
          label="Assessment Completion"
          value={reputation.assessmentCompletionRate ?? 0}
          icon={<CheckSquare className="h-3 w-3" />}
          color="bg-emerald-400"
        />
        <MetricBar
          label="Response Rate"
          value={reputation.responseRate ?? 0}
          icon={<Zap className="h-3 w-3" />}
          color="bg-blue-400"
        />
      </div>
    </Card>
  );
}
