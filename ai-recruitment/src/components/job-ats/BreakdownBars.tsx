"use client";

import { useEffect, useState } from "react";

interface BreakdownItem {
  score: number;
  weight: number;
  reason: string;
}

interface Props {
  breakdown: Record<string, BreakdownItem>;
}

export function BreakdownBars({ breakdown }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(id);
  }, []);

  const entries = Object.entries(breakdown ?? {});

  return (
    <div className="space-y-3">
      {entries.map(([key, value], index) => {
        const label =
          key === "keywordMatch"
            ? "Keyword Match"
            : key === "experienceMatch"
            ? "Experience Match"
            : key === "skillsMatch"
            ? "Skills Match"
            : key === "educationMatch"
            ? "Education Match"
            : key === "formattingScore"
            ? "Formatting"
            : key;

        const width = Math.max(0, Math.min(100, value.score));

        return (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {label}{" "}
                <span className="text-slate-400 font-normal">
                  ({value.weight}%)
                </span>
              </span>
              <span className="text-slate-500 font-semibold">{value.score}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{
                  width: animated ? `${width}%` : "0%",
                  transition: `width 0.6s ease-out ${index * 0.1}s`,
                }}
              />
            </div>
            {value.reason && (
              <p className="mt-1 text-[11px] text-slate-500">{value.reason}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

