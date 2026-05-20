"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useReducedMotion } from "./useReducedMotion";

interface SummaryCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

export function SummaryCard({ label, value, icon: Icon, color }: SummaryCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      className="flex min-w-[140px] flex-1 cursor-default items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}18` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div className="font-mono text-xl font-bold leading-none text-gray-900">
          {value}
        </div>
        <div className="mt-0.5 text-xs font-medium text-gray-500">{label}</div>
      </div>
    </motion.div>
  );
}
