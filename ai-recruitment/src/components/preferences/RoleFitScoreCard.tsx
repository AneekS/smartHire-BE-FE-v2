"use client";

import type { RoleFitScoreDto } from "@/hooks/usePreferences";

interface RoleFitScoreCardProps {
  score: RoleFitScoreDto;
}

export function RoleFitScoreCard({ score }: RoleFitScoreCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role Fit Score</p>
      <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{score.role}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Score: {Math.round(score.score)}%</p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Strengths</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
          {score.strengths.length === 0 ? <li>-</li> : score.strengths.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Skill Gaps</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
          {score.skillGaps.length === 0 ? <li>-</li> : score.skillGaps.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      </div>
    </div>
  );
}
