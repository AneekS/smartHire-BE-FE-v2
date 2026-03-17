"use client";

import { useJobATSStore } from "@/store/useJobATSStore";
import { ScoreRingCard } from "./ScoreRingCard";
import { BreakdownBars } from "./BreakdownBars";
import { KeywordMatchPanel } from "./KeywordMatchPanel";
import { SectionScoresGrid } from "./SectionScoresGrid";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { TailoredSummaryCard } from "./TailoredSummaryCard";

export function ScoreResultPanel() {
  const { currentResult } = useJobATSStore();

  if (!currentResult) {
    return (
      <div
        id="job-ats-result-panel"
        className="h-full flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-2xl"
      >
        Run an analysis to see your personalized ATS score, keyword gaps, and
        targeted recommendations.
      </div>
    );
  }

  const {
    overallScore,
    scoreLabel,
    matchSummary,
    breakdown,
    keywordAnalysis,
    sectionScores,
    recommendations,
    tailoredSummary,
    topMissingKeywordsToAdd,
  } = currentResult;

  return (
    <div
      id="job-ats-result-panel"
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-[fade-in-ats_0.5s_ease-out]"
    >
      <div className="flex flex-col gap-6">
        <ScoreRingCard
          score={overallScore}
          label={scoreLabel}
          summary={matchSummary}
        />
        <BreakdownBars breakdown={breakdown} />
        <KeywordMatchPanel analysis={keywordAnalysis} />
        <SectionScoresGrid sectionScores={sectionScores} />
        <RecommendationsPanel recommendations={recommendations} />
        <TailoredSummaryCard
          summary={tailoredSummary}
          topMissingKeywordsToAdd={topMissingKeywordsToAdd}
        />
      </div>
      <style jsx>{`
        @keyframes fade-in-ats {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

