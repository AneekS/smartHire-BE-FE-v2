"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import type { GapAnalysis } from "@/store/useSkillGapStore";
import { RoadmapPhaseCard } from "./RoadmapPhaseCard";

interface Props {
  analysis: GapAnalysis;
}

export function LearningRoadmapTimeline({ analysis }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const phases = analysis.learningRoadmap?.phases ?? [];

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">Learning roadmap</h3>
        <p className="text-xs text-gray-500">
          Follow these phases sequentially.
        </p>
      </div>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-200" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {phases.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-6 text-center text-sm text-gray-500">
              No roadmap phases yet. Run an analysis to see your learning path.
            </div>
          ) : (
            phases.map((phase, idx) => (
              <RoadmapPhaseCard key={phase.phase != null ? `phase-${phase.phase}-${idx}` : `phase-${idx}`} phase={phase} index={idx} />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
