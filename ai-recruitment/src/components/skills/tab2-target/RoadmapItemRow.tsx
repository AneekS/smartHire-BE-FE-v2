"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import type { GapAnalysisRoadmapItem } from "@/store/useSkillGapStore";
import { useSkillGapStore } from "@/store/useSkillGapStore";
import { Button } from "@/components/ui/button";

interface Props {
  item: GapAnalysisRoadmapItem;
}

const typeStyles: Record<string, { bg: string; border: string }> = {
  learn: { bg: "bg-violet-50", border: "border-l-violet-400" },
  build: { bg: "bg-blue-50", border: "border-l-blue-400" },
  practice: { bg: "bg-emerald-50", border: "border-l-emerald-400" },
};

export function RoadmapItemRow({ item }: Props) {
  const completedItems = useSkillGapStore((s) => s.completedItems);
  const toggle = useSkillGapStore((s) => s.toggleItemComplete);
  const completed = completedItems.has(item.id);
  const style = typeStyles[item.type] ?? typeStyles.learn;

  return (
    <motion.div
      layout
      className={`flex items-center justify-between gap-3 rounded-2xl border border-gray-100 ${style.border} border-l-4 ${style.bg} p-4 shadow-sm ${
        completed ? "opacity-70" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => toggle(item.id)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <motion.div
          initial={false}
          animate={{ scale: completed ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-gray-300" />
          )}
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-gray-800 ${completed ? "line-through text-gray-400" : ""}`}>
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {item.type === "learn" ? "📖 Learn" : item.type === "build" ? "🛠 Build" : "🎯 Practice"} · ⏱ {item.estimatedWeeks} weeks
          </p>
        </div>
      </button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 shrink-0 rounded-lg text-xs text-violet-600 hover:bg-violet-50"
        type="button"
      >
        Resources ▶
      </Button>
    </motion.div>
  );
}
