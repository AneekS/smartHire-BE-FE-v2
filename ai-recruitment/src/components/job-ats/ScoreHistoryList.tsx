"use client";

import { useEffect } from "react";
import { useJobATSStore } from "@/store/useJobATSStore";

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 60) return "bg-blue-100 text-blue-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function ScoreHistoryList() {
  const { scoreHistory, loadHistory, activeHistoryId, selectHistoryItem } =
    useJobATSStore();

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  if (!scoreHistory.length) {
    return (
      <div className="mt-6 text-xs text-gray-400">
        No previous ATS analyses yet. Your history will appear here after your
        first score.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.18em] mb-1">
        Previous Analyses
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {scoreHistory.map((item) => {
          const created = new Date(item.createdAt);
          const now = new Date();
          const diffMs = now.getTime() - created.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMinutes / 60);
          const diffDays = Math.floor(diffHours / 24);
          const timeAgo =
            diffMinutes < 60
              ? `${diffMinutes || 1} min ago`
              : diffHours < 24
              ? `${diffHours} h ago`
              : `${diffDays} d ago`;

          const active = activeHistoryId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectHistoryItem(item)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs transition-all ${
                active
                  ? "border-violet-300 bg-violet-50"
                  : "border-gray-100 hover:border-violet-200 hover:bg-violet-50/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="truncate text-gray-900 font-semibold">
                  {item.jobTitle}
                  {item.companyName && (
                    <span className="text-gray-400"> — {item.companyName}</span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreColor(
                    item.overallScore
                  )}`}
                >
                  {item.overallScore}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="truncate max-w-[70%]">{item.matchSummary}</span>
                <span>{timeAgo}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

