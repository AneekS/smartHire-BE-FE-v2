"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { GapAnalysisRoadmapPhase } from "@/store/useSkillGapStore";
import { RoadmapItemRow } from "./RoadmapItemRow";

interface Props {
  phase: GapAnalysisRoadmapPhase;
  index: number;
}

const phaseStyles: Record<number, { border: string; bg: string; dot: string }> = {
  1: { border: "border-l-blue-400", bg: "bg-blue-50/80", dot: "bg-blue-500" },
  2: { border: "border-l-violet-400", bg: "bg-violet-50/80", dot: "bg-violet-500" },
  3: { border: "border-l-purple-400", bg: "bg-purple-50/80", dot: "bg-purple-500" },
  4: { border: "border-l-emerald-400", bg: "bg-emerald-50/80", dot: "bg-emerald-500" },
};

export function RoadmapPhaseCard({ phase, index }: Props) {
  const [open, setOpen] = useState(true);
  const style = phaseStyles[phase.phase] ?? phaseStyles[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="relative pl-7"
    >
      <div className={`absolute left-0 top-3 h-3 w-3 rounded-full ${style.dot} ring-2 ring-white shadow-sm`} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-2xl border border-gray-100 ${style.border} border-l-4 bg-white px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-800">
            Phase {phase.phase} · {phase.title}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">{phase.weeks}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">{phase.items?.length ?? 0} items</span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>
      {open && phase.items?.length ? (
        <div className="mt-2 space-y-2 pl-1">
          {phase.items.map((item, i) => (
            <RoadmapItemRow key={item.id ? `${item.id}-${i}` : `item-${i}`} item={item} />
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
