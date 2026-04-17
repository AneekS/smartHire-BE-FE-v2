"use client";

import { motion } from "framer-motion";

const R = 54;
const STROKE = 8;
const C = 2 * Math.PI * R;

function ringColor(score: number) {
  if (score >= 80) return "#059669";
  if (score >= 65) return "#2563eb";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

export function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const offset = C * (1 - pct / 100);
  const color = ringColor(score);

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg
        width="144"
        height="144"
        viewBox="0 0 144 144"
        className="transform -rotate-90"
        aria-hidden
      >
        <circle
          cx="72"
          cy="72"
          r={R}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx="72"
          cy="72"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black text-gray-900 tabular-nums">
          {Math.round(pct)}
        </span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          ATS
        </span>
      </div>
    </div>
  );
}
