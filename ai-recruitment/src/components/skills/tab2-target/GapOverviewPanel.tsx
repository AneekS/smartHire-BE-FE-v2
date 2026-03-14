"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { GapAnalysis } from "@/store/useSkillGapStore";

interface Props {
  analysis: GapAnalysis;
}

export function GapOverviewPanel({ analysis }: Props) {
  const total = analysis.skillsRequired?.length ?? 0;
  const have = analysis.skillsYouHave?.filter((s) => s.meetsRequirement).length ?? analysis.skillsYouHave?.length ?? 0;
  const missing = analysis.criticalGaps?.length ?? 0;
  const partial = analysis.partialSkills?.length ?? 0;
  const months = Math.round(analysis.estimatedWeeksToReady / 4) || 1;

  return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-gray-800">
          Gap overview for target role
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          Snapshot of how close you are to being ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Role Match Score</span>
            <span className="font-bold text-violet-600">{analysis.roleMatchScore}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
              style={{ width: `${analysis.roleMatchScore}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2">
            <p className="text-xs text-gray-500">Skills required</p>
            <p className="mt-1 text-lg font-bold text-gray-800">{total || "—"}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2">
            <p className="text-xs text-emerald-600">You have</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{have} ✅</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2">
            <p className="text-xs text-red-600">Missing</p>
            <p className="mt-1 text-lg font-bold text-red-600">{missing} ❌</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2">
            <p className="text-xs text-amber-600">Partial</p>
            <p className="mt-1 text-lg font-bold text-amber-700">{partial} ⚠️</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm">
          <p className="flex items-center justify-between">
            <span className="text-gray-500">Estimated time to ready</span>
            <span className="font-medium text-gray-800">⏱ {months}-{months + 1} months</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-gray-500">Difficulty</span>
            <span className="font-medium text-gray-800 capitalize">
              {String(analysis.difficultyLevel).replace("_", " ")}
            </span>
          </p>
        </div>

        {analysis.domainBreakdown?.length ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Domain breakdown
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.domainBreakdown.map((d, i) => (
                <span
                  key={d.domain ? `${d.domain}-${i}` : `domain-${i}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    d.status === "strong"
                      ? "bg-emerald-100 text-emerald-700"
                      : d.status === "partial"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {d.domain}: {d.matchPercent}%
                  {d.status === "strong" ? " ✅" : d.status === "partial" ? " ⚠️" : " ❌"}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
