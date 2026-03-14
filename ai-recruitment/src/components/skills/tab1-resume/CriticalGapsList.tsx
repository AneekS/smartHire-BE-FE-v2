"use client";

import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GapAnalysis } from "@/store/useSkillGapStore";
import { useSkillGapStore } from "@/store/useSkillGapStore";

interface Props {
  analysis: GapAnalysis | null;
  loading: boolean;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function demandBorder(score: number) {
  if (score > 80) return "border-l-red-400";
  if (score > 60) return "border-l-amber-400";
  return "border-l-blue-400";
}

function demandBadge(score: number) {
  if (score > 80) return "bg-red-100 text-red-700 font-bold";
  if (score > 60) return "bg-amber-100 text-amber-700 font-bold";
  return "bg-blue-100 text-blue-700 font-bold";
}

function demandLabel(score: number) {
  if (score > 80) return "HIGH DEMAND";
  if (score > 60) return "HIGH DEMAND";
  return "MODERATE";
}

export function CriticalGapsList({ analysis, loading }: Props) {
  const raw = analysis?.criticalGaps;
  const criticalGaps = Array.isArray(raw)
    ? [...raw].sort((a, b) => (b.demandScore ?? 0) - (a.demandScore ?? 0))
    : [];
  const openDrawer = useSkillGapStore((s) => s.openResourceDrawer);
  const hasGaps = criticalGaps.length > 0;

  return (
    <Card className="border border-gray-100 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Critical Gaps
        </CardTitle>
        <p className="text-sm text-gray-500">
          Skills you need to land your target role
        </p>
      </CardHeader>
      <CardContent className="min-h-[140px] space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-gray-50/80 py-10">
            <p className="text-sm text-gray-500">Loading gaps...</p>
          </div>
        ) : !hasGaps ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-2 font-semibold text-emerald-600">All Clear! No critical gaps found.</p>
            <p className="mt-1 text-sm text-emerald-600/80">Keep building on your strengths.</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {criticalGaps.map((gap, i) => (
              <motion.div
                key={gap.skill ? `${gap.skill}-${i}` : `gap-${i}`}
                variants={itemVariants}
                className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${demandBorder(gap.demandScore)} border-l-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{gap.skill}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Required in {gap.demandScore}% of job postings for your target role
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wide ${demandBadge(gap.demandScore)}`}>
                    {demandLabel(gap.demandScore)} {gap.demandScore}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${gap.demandScore > 80 ? "bg-red-400" : gap.demandScore > 60 ? "bg-amber-400" : "bg-blue-400"}`}
                    style={{ width: `${Math.min(100, gap.demandScore)}%` }}
                  />
                </div>
                {gap.relevantRoles?.length ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Relevant for: {gap.relevantRoles.join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-gray-500">
                  ⏱ Est. ~{gap.estimatedWeeks} weeks at 2hrs/day
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg border-violet-300 text-violet-600 hover:bg-violet-50"
                    onClick={() => openDrawer(gap.skill)}
                  >
                    <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                    Start Learning
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg border-purple-200 text-purple-600 hover:bg-purple-50"
                  >
                    + Add to Learning Path
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
