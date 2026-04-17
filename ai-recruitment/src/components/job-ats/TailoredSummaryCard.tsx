"use client";

export function TailoredSummaryCard({
  summary,
  topMissingKeywordsToAdd,
}: {
  summary: string;
  topMissingKeywordsToAdd: string[];
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch (e) {
      console.error("Failed to copy summary", e);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-[0.18em]">
          Tailored professional summary
        </h3>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-3 py-1.5 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Copy to clipboard
        </button>
      </div>
      <div className="relative pl-4 text-sm text-slate-800 leading-relaxed">
        <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-violet-400 to-emerald-400 rounded-full" />
        <p>{summary}</p>
      </div>
      {topMissingKeywordsToAdd?.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
            High-impact keywords to weave in:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topMissingKeywordsToAdd.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-medium"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
