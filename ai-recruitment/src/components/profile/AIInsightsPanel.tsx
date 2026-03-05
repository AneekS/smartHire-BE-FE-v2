"use client";

import { Brain, Zap, TrendingUp, Star, AlertCircle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIInsights } from "@/hooks";
import { cn } from "@/lib/utils";

const CAREER_LEVEL_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  JUNIOR:    { label: "Junior",    color: "bg-blue-100 text-blue-700",    icon: "🌱" },
  MID:       { label: "Mid-Level", color: "bg-cyan-100 text-cyan-700",    icon: "🚀" },
  SENIOR:    { label: "Senior",    color: "bg-violet-100 text-violet-700", icon: "⚡" },
  LEAD:      { label: "Lead",      color: "bg-amber-100 text-amber-700",   icon: "🔥" },
  EXECUTIVE: { label: "Executive", color: "bg-rose-100 text-rose-700",     icon: "👑" },
};

function ReadinessGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const radius = 52;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle stroke="#e2e8f0" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black text-slate-900 dark:text-white">{pct}</span>
        <span className="text-[10px] font-semibold text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function SkillBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-bold text-slate-500">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function AIInsightsPanel() {
  const { insights, isLoading, hasInsights } = useAIInsights();

  if (isLoading) {
    return (
      <section>
        <div className="mb-6">
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </section>
    );
  }

  if (!hasInsights) {
    return (
      <section>
        <div className="mb-6">
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI Profile Insights
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">AI-powered analysis of your profile</p>
        </div>
        <Card className="rounded-2xl border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h4 className="font-semibold text-slate-600 dark:text-slate-400">Upload your resume to unlock AI insights</h4>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            Once you upload a resume, our AI will analyze your profile and provide career-level estimation, skill strength analysis, and personalized improvement suggestions.
          </p>
        </Card>
      </section>
    );
  }

  const careerLvl = CAREER_LEVEL_CONFIG[insights?.careerLevel ?? ""] ?? null;
  const skillDist = (insights?.skillStrengthDistribution ?? {}) as Record<string, number>;
  const topSkills = insights?.extractedSkills?.slice(0, 10) ?? [];

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI Profile Insights
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">Powered by GPT-4 analysis of your profile</p>
        </div>
        {insights?.lastAnalyzedAt && (
          <span className="text-xs text-slate-400">
            Last analyzed {new Date(insights.lastAnalyzedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        {/* Career Level */}
        <Card className={cn("rounded-2xl border-0 p-6 text-center", careerLvl ? "bg-gradient-to-br from-primary/10 to-indigo-500/10" : "bg-slate-50 dark:bg-slate-800")}>
          <div className="text-4xl mb-2">{careerLvl?.icon ?? "❓"}</div>
          <h4 className="font-black text-lg text-slate-900 dark:text-white">{careerLvl?.label ?? "Unknown"}</h4>
          <p className="text-xs text-slate-500 mt-0.5">Career Level</p>
          {careerLvl && (
            <Badge className={cn("mt-3 text-[10px] uppercase", careerLvl.color)}>{careerLvl.label}</Badge>
          )}
        </Card>

        {/* Readiness Score */}
        <Card className="rounded-2xl border-0 bg-slate-50 p-6 flex flex-col items-center justify-center dark:bg-slate-800">
          <ReadinessGauge score={Math.round((insights?.roleReadinessScore ?? 0) * 100)} />
          <p className="text-xs text-slate-500 mt-3 font-medium">Role Readiness</p>
        </Card>

        {/* Top skills */}
        <Card className="rounded-2xl border-0 bg-slate-50 p-6 dark:bg-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Top Skills</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((sk) => (
              <Badge key={sk} className="bg-white border border-slate-200 text-slate-700 text-[10px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300">
                {sk}
              </Badge>
            ))}
            {topSkills.length === 0 && <p className="text-xs text-slate-400">No skills detected yet</p>}
          </div>
        </Card>
      </div>

      {/* Skill Distribution */}
      {Object.keys(skillDist).length > 0 && (
        <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800 mb-4">
          <h4 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white mb-5">
            <TrendingUp className="h-4 w-4 text-primary" /> Skill Strength Distribution
          </h4>
          <div className="space-y-3">
            {Object.entries(skillDist)
              .sort((a, b) => b[1] - a[1])
              .map(([label, score]) => (
                <SkillBar key={label} label={label} score={score} />
              ))}
          </div>
        </Card>
      )}

      {/* Experience Summary */}
      {insights?.experienceSummary && (
        <Card className="rounded-2xl border-slate-200/60 p-6 dark:border-slate-800 mb-4">
          <h4 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-white mb-3">
            <Zap className="h-4 w-4 text-primary" /> AI-Generated Summary
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{insights.experienceSummary}</p>
        </Card>
      )}

      {/* Improvement suggestions */}
      {(insights?.suggestedImprovements?.length ?? 0) > 0 && (
        <Card className="rounded-2xl border-amber-200/60 bg-amber-50/50 p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
          <h4 className="font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-400 mb-4">
            <AlertCircle className="h-4 w-4" /> Suggested Improvements
          </h4>
          <ul className="space-y-2">
            {insights!.suggestedImprovements!.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                <ChevronRight className="h-4 w-4 mt-px shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
