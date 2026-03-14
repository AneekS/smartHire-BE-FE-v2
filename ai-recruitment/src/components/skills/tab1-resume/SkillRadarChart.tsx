"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion, animate } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { GapAnalysis } from "@/store/useSkillGapStore";

interface Props {
  analysis: GapAnalysis | null;
  loading: boolean;
}

const RADAR_HEIGHT = 280;

const roleReadinessColor = (score: number) => {
  if (score < 50) return "text-red-500";
  if (score < 70) return "text-amber-600";
  if (score < 85) return "text-violet-600";
  return "text-emerald-600";
};

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function SkillRadarChart({ analysis }: Props) {
  const [displayScore, setDisplayScore] = useState(0);

  const data = analysis?.radarData ?? [
    { domain: "Technical Skills", yourScore: 40, marketDemand: 80 },
    { domain: "System Design", yourScore: 20, marketDemand: 75 },
    { domain: "Communication", yourScore: 50, marketDemand: 70 },
    { domain: "Leadership", yourScore: 10, marketDemand: 60 },
    { domain: "Domain Knowledge", yourScore: 35, marketDemand: 75 },
    { domain: "Tools & DevOps", yourScore: 30, marketDemand: 80 },
  ];

  const roleScore = analysis?.roleMatchScore ?? 0;

  useEffect(() => {
    const controls = animate(0, roleScore, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayScore(Math.round(latest)),
    });
    return () => controls.stop();
  }, [roleScore]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <Card className="h-full border border-gray-100 bg-white p-6 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-800">
            Skill Radar vs Market Demand
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-gray-500">
            How your capabilities compare to what hiring managers expect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div style={{ height: RADAR_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height={RADAR_HEIGHT}>
              <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis
                  dataKey="domain"
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Your Skills"
                  dataKey="yourScore"
                  fill="rgba(124,58,237,0.2)"
                  stroke="#7C3AED"
                  strokeWidth={2}
                />
                <Radar
                  name="Market Demand"
                  dataKey="marketDemand"
                  fill="rgba(245,158,11,0.1)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Legend
                  wrapperStyle={{ paddingTop: 12 }}
                  formatter={() => null}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> Your Skills
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Market Demand
            </span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-sm font-medium text-gray-500">Role Readiness Score</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 via-violet-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${roleScore}%` }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {roleScore < 50 ? "Significant gaps" : roleScore < 70 ? "Building momentum" : roleScore < 85 ? "Close to ready" : "Job ready"}
                </p>
              </div>
              <p className={`text-3xl font-bold tabular-nums ${roleReadinessColor(roleScore)}`}>
                {displayScore}%
              </p>
            </div>
          </div>

          {analysis?.domainBreakdown?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {analysis.domainBreakdown.map((d, i) => {
                const pct = d.matchPercent;
                const chipClass =
                  pct >= 75
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : pct >= 50
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-red-100 text-red-700 border-red-200";
                const icon = pct >= 75 ? "✅" : pct >= 50 ? "⚠️" : "❌";
                return (
                  <span
                    key={d.domain ? `${d.domain}-${i}` : `domain-${i}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${chipClass}`}
                  >
                    {d.domain} {pct}% {icon}
                  </span>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
