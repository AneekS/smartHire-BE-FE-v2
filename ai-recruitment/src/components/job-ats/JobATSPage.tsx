"use client";

import { JobInputForm } from "./JobInputForm";
import { ScoreHistoryList } from "./ScoreHistoryList";
import { ScoreResultPanel } from "./ScoreResultPanel";

export function JobATSPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-600 text-white">
            🎯
          </span>
          Job ATS Scorer
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl">
          See exactly how your resume scores for any job posting and get
          pinpoint guidance to close keyword and experience gaps.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-violet-50 border border-violet-100 px-3 py-1.5 text-[11px] text-violet-700">
          Paste a job description to get your personalized ATS score and keyword
          gap analysis.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-6 items-start">
        <div className="space-y-4">
          <JobInputForm />
          <ScoreHistoryList />
        </div>
        <ScoreResultPanel />
      </div>
    </div>
  );
}

