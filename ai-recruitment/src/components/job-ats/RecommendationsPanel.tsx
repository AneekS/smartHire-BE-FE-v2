"use client";

export interface RecommendationBuckets {
  critical: Array<{
    priority: number;
    action: string;
    impact: string;
    example: string;
  }>;
  important: Array<{
    priority: number;
    action: string;
    impact: string;
    example: string;
  }>;
  quickWins: Array<{
    action: string;
    timeToImplement: string;
    impact: string;
  }>;
}

export function RecommendationsPanel({
  recommendations,
}: {
  recommendations: RecommendationBuckets;
}) {
  const critical = [...(recommendations.critical ?? [])].sort(
    (a, b) => a.priority - b.priority
  );
  const important = [...(recommendations.important ?? [])].sort(
    (a, b) => a.priority - b.priority
  );
  const quickWins = recommendations.quickWins ?? [];

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
        <h3 className="text-xs font-semibold text-red-700 uppercase tracking-[0.18em] mb-2">
          Critical fixes
        </h3>
        <div className="space-y-2 text-[11px] text-red-900">
          {critical.length === 0 && (
            <p>No critical issues detected for this job.</p>
          )}
          {critical.map((item, i) => (
            <div
              key={`${item.priority}-${i}`}
              className="rounded-xl bg-white/80 border border-red-100 px-3 py-2"
            >
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-semibold">{item.action}</span>
                <span className="text-[9px] bg-red-50 border border-red-100 rounded-full px-2 py-0.5 text-red-700 shrink-0">
                  {item.impact}
                </span>
              </div>
              {item.example && (
                <p className="text-[10px] text-red-700">
                  Example: <span className="italic">{item.example}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
        <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-[0.18em] mb-2">
          Important improvements
        </h3>
        <div className="space-y-2 text-[11px] text-amber-900">
          {important.length === 0 && (
            <p>No important improvements suggested.</p>
          )}
          {important.map((item, i) => (
            <div
              key={`${item.priority}-${i}`}
              className="rounded-xl bg-white/80 border border-amber-100 px-3 py-2"
            >
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-semibold">{item.action}</span>
                <span className="text-[9px] bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 text-amber-700 shrink-0">
                  {item.impact}
                </span>
              </div>
              {item.example && (
                <p className="text-[10px] text-amber-700">
                  Example: <span className="italic">{item.example}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-[0.18em] mb-2">
          Quick wins
        </h3>
        <div className="space-y-2 text-[11px] text-emerald-900">
          {quickWins.length === 0 && (
            <p>No quick wins suggested. Your resume is already well-tailored.</p>
          )}
          {quickWins.map((item, i) => (
            <div
              key={`${item.action}-${i}`}
              className="rounded-xl bg-white/80 border border-emerald-100 px-3 py-2"
            >
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-semibold">{item.action}</span>
                <span className="text-[9px] bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 text-emerald-700 shrink-0">
                  {item.timeToImplement} • {item.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
