"use client";

interface KeywordAnalysis {
  present: Array<{
    keyword: string;
    frequency: number;
    context: string;
    importance: string;
  }>;
  missing: Array<{
    keyword: string;
    importance: string;
    suggestion: string;
    section: string;
  }>;
  partialMatch: Array<{
    jdKeyword: string;
    resumeVariant: string;
    recommendation: string;
  }>;
}

interface Props {
  analysis: KeywordAnalysis;
}

export function KeywordMatchPanel({ analysis }: Props) {
  const present = analysis?.present ?? [];
  const missing = analysis?.missing ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-[0.18em]">
            ✅ Keywords Found
          </h3>
          <span className="text-[11px] text-emerald-700/80">
            {present.length} matched
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {present.map((k, i) => (
            <div
              key={`${k.keyword}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white shadow-sm border border-emerald-100 px-3 py-1 text-xs text-emerald-800"
              style={{
                transformOrigin: "center",
                animation: "keyword-pop 0.25s ease-out forwards",
                animationDelay: `${i * 0.03}s`,
                opacity: 0,
              }}
            >
              <span className="font-semibold">{k.keyword}</span>
              <span className="text-[10px] text-emerald-500 bg-emerald-50 rounded-full px-1.5 py-0.5">
                ×{k.frequency}
              </span>
            </div>
          ))}
          {present.length === 0 && (
            <p className="text-xs text-emerald-700/80">
              No explicit JD keywords detected in your resume text.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-red-700 uppercase tracking-[0.18em]">
            ❌ Keywords Missing
          </h3>
          <span className="text-[11px] text-red-700/80">
            {missing.length} gaps
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {missing.map((k, i) => (
            <div
              key={`${k.keyword}-${i}`}
              className="inline-flex flex-col rounded-xl bg-white shadow-sm border border-red-100 px-3 py-1.5 text-[11px] text-red-800"
              style={{
                transformOrigin: "center",
                animation: "keyword-pop 0.25s ease-out forwards",
                animationDelay: `${i * 0.03}s`,
                opacity: 0,
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold truncate max-w-[120px]">
                  {k.keyword}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                  {k.importance === "critical"
                    ? "Critical"
                    : k.importance === "important"
                    ? "Important"
                    : "Nice to have"}
                </span>
              </div>
              <span className="text-[10px] text-red-500">
                Add to: <span className="font-medium">{k.section}</span>
              </span>
            </div>
          ))}
          {missing.length === 0 && (
            <p className="text-xs text-red-700/80">
              No high-impact missing keywords detected for this job.
            </p>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes keyword-pop {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

