"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GapAnalysis } from "@/store/useSkillGapStore";

interface Props {
  analysis: GapAnalysis | null;
  loading: boolean;
}

const levelToPercent = (level: "beginner" | "intermediate" | "expert") => {
  if (level === "beginner") return 33;
  if (level === "intermediate") return 66;
  return 90;
};

export function PartialSkillsList({ analysis }: Props) {
  const [expanded, setExpanded] = useState(false);
  const partial = analysis?.partialSkills ?? [];
  if (!partial.length) return null;

  return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-700">
          <AlertCircle className="h-4 w-4" />
          Skills to Level Up ({partial.length})
        </CardTitle>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <CardContent className="space-y-3 border-t border-gray-100 pt-4">
          {partial.map((p, i) => {
            const current = levelToPercent(p.currentLevel);
            const required = levelToPercent(p.requiredLevel);
            return (
              <div
                key={p.skill ? `${p.skill}-${i}` : `partial-${i}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
              >
                <p className="w-24 shrink-0 font-medium text-gray-700">{p.skill}</p>
                <div className="flex flex-1 items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    {p.currentLevel}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {p.requiredLevel}
                  </span>
                </div>
                <div className="h-2 flex-1 min-w-[80px] max-w-[180px] overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${current}%` }}
                  />
                </div>
                <a
                  href="#"
                  className="text-xs font-medium text-violet-600 underline underline-offset-2 hover:no-underline"
                >
                  Resources
                </a>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
