"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GapAnalysis } from "@/store/useSkillGapStore";

interface Props {
  analysis: GapAnalysis | null;
  loading: boolean;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

/** Normalize so each item has .name and .proficiency (API may return strings or objects) */
function normalizeSkillsYouHave(skillsYouHave: GapAnalysis["skillsYouHave"] | null | undefined): Array<{ name: string; proficiency: "beginner" | "intermediate" | "expert" }> {
  const raw = skillsYouHave ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const name = typeof s === "string" ? s : (s?.name ?? String(s));
    const proficiency = typeof s === "object" && s?.proficiency ? s.proficiency : "intermediate";
    return { name, proficiency };
  }).filter((s) => s.name && s.name.trim());
}

export function SkillsYouHaveGrid({ analysis }: Props) {
  const [expanded, setExpanded] = useState(false);
  const skills = normalizeSkillsYouHave(analysis?.skillsYouHave);
  const visibleCount = expanded ? skills.length : 12;
  const visible = skills.slice(0, visibleCount);
  const remaining = skills.length - visibleCount;

  if (!skills.length) return null;

  return (
    <Card className="border border-emerald-100 bg-emerald-50/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Skills You Have ({skills.length})
        </CardTitle>
        {skills.length > 12 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs font-medium text-emerald-600 hover:underline"
          >
            {expanded ? "Show less" : "Show all ↓"}
          </button>
        )}
      </CardHeader>
      <CardContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex max-h-[80px] flex-wrap gap-2 overflow-hidden"
          style={{ maxHeight: expanded ? "none" : undefined }}
        >
          {visible.map((s, i) => (
            <motion.span
              key={`${s.name}-${i}`}
              variants={chipVariants}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-700 shadow-sm"
            >
              {s.name}
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-600">
                {s.proficiency}
              </span>
            </motion.span>
          ))}
          {!expanded && remaining > 0 && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100/80 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              +{remaining} more
            </span>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}
