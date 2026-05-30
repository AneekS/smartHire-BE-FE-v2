"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJobATSStore } from "@/store/useJobATSStore";
import { ScoreRing } from "./ScoreRing";
import {
  KeywordMatchPanel,
  type KeywordAnalysis,
} from "./KeywordMatchPanel";
import { BreakdownBars } from "./BreakdownBars";
import { ATSResponseTransformer } from "@/lib/transformers/ATSResponseTransformer";
import { SectionScoresGrid } from "./SectionScoresGrid";
import {
  RecommendationsPanel,
  type RecommendationBuckets,
} from "./RecommendationsPanel";
import { TailoredSummaryCard } from "./TailoredSummaryCard";
import { JobDetailDrawer } from "./JobDetailDrawer";

function ModalSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-6 items-center">
        <div className="w-36 h-36 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
      </div>
      <div className="h-40 bg-gray-100 rounded-2xl" />
      <div className="h-24 bg-gray-100 rounded-2xl" />
    </div>
  );
}

export function ATSScoreModal() {
  const {
    showScoreModal,
    closeModal,
    currentResult,
    isScoring,
    isLoadingDetail,
    scoringError,
    selectedJob,
  } = useJobATSStore();

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!showScoreModal) setDrawerOpen(false);
  }, [showScoreModal]);

  const loading = isScoring || isLoadingDetail;
  const score =
    typeof currentResult?.overallScore === "number"
      ? currentResult.overallScore
      : 0;

  return (
    <>
      <JobDetailDrawer
        jobId={selectedJob?.id ?? null}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <AnimatePresence>
        {showScoreModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close modal"
              className="absolute inset-0 bg-black/45"
              onClick={closeModal}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative w-full sm:max-w-4xl max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                    Job match score
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    {selectedJob?.job_title ?? "Job"}
                  </h2>
                  <p className="text-sm text-gray-500 truncate">
                    {selectedJob?.company_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedJob?.id && (
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      View full JD
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
                    aria-label="Close modal"
                  >
                    {"\u00D7"}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {scoringError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm p-4 mb-4">
                    {scoringError}
                  </div>
                )}

                {loading && <ModalSkeleton />}

                {!loading && currentResult && !scoringError && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                      <ScoreRing score={score} />
                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {typeof currentResult.scoreLabel === "string" && (
                            <p className="text-sm font-bold text-violet-700">
                              {currentResult.scoreLabel}
                            </p>
                          )}
                          {typeof currentResult.grade === "string" && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                              Grade {currentResult.grade}
                            </span>
                          )}
                          {typeof currentResult.recommendation === "string" && (
                            <span className="text-xs font-medium text-slate-500">
                              {currentResult.recommendation.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        {typeof currentResult.matchSummary === "string" && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {currentResult.matchSummary}
                          </p>
                        )}
                        {currentResult.cached === true && (
                          <p className="text-[11px] text-gray-400 mt-2">
                            Cached result — no new AI run
                          </p>
                        )}
                      </div>
                    </div>

                    {currentResult.keywordAnalysis &&
                      typeof currentResult.keywordAnalysis === "object" && (
                        <KeywordMatchPanel
                          analysis={
                            currentResult.keywordAnalysis as KeywordAnalysis
                          }
                        />
                      )}

                    {(() => {
                      const chartPoints =
                        ATSResponseTransformer.toBreakdownChart(currentResult);
                      if (!chartPoints.length) return null;

                      const normalized =
                        ATSResponseTransformer.toClientAts(currentResult);
                      const rawBd =
                        normalized.breakdown ?? normalized.scoreBreakdown ?? {};

                      const breakdown = Object.fromEntries(
                        chartPoints.map((pt) => {
                          const comp = rawBd[pt.name as keyof typeof rawBd];
                          return [
                            pt.name,
                            {
                              score: pt.score,
                              weight: pt.weight,
                              reason:
                                comp && typeof comp.reason === "string"
                                  ? comp.reason
                                  : "",
                            },
                          ];
                        })
                      );

                      return <BreakdownBars breakdown={breakdown} />;
                    })()}

                    {Array.isArray(currentResult.dealbreakers) &&
                      currentResult.dealbreakers.length > 0 && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                          <p className="font-semibold text-xs uppercase tracking-wide mb-1">
                            Dealbreakers
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {currentResult.dealbreakers.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {Array.isArray(currentResult.topStrengths) &&
                      currentResult.topStrengths.length > 0 && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm">
                          <p className="font-semibold text-emerald-800 text-xs uppercase mb-1">
                            Top strengths
                          </p>
                          <ul className="list-disc pl-4 text-emerald-900 space-y-0.5">
                            {currentResult.topStrengths.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {Array.isArray(currentResult.topGaps) &&
                      currentResult.topGaps.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm">
                          <p className="font-semibold text-amber-900 text-xs uppercase mb-1">
                            Top gaps
                          </p>
                          <ul className="list-disc pl-4 text-amber-950 space-y-0.5">
                            {currentResult.topGaps.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {currentResult.sectionScores &&
                      typeof currentResult.sectionScores === "object" && (
                        <SectionScoresGrid
                          sectionScores={
                            currentResult.sectionScores as Record<
                              string,
                              Record<string, unknown>
                            >
                          }
                        />
                      )}

                    {currentResult.competitiveAnalysis &&
                      typeof currentResult.competitiveAnalysis === "object" && (
                        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-[0.18em] mb-2">
                            Competitive analysis
                          </h3>
                          {(() => {
                            const ca = currentResult.competitiveAnalysis as {
                              strongPoints?: string[];
                              weakPoints?: string[];
                              uniqueSellingPoints?: string[];
                              estimatedPassRate?: string;
                            };
                            return (
                              <div className="grid gap-3 md:grid-cols-2 text-[13px] text-slate-700">
                                {ca.estimatedPassRate && (
                                  <p className="md:col-span-2 font-medium text-violet-700">
                                    {ca.estimatedPassRate}
                                  </p>
                                )}
                                {Array.isArray(ca.strongPoints) &&
                                  ca.strongPoints.length > 0 && (
                                    <div>
                                      <p className="font-semibold text-slate-800 mb-1">
                                        Strengths
                                      </p>
                                      <ul className="list-disc pl-4 space-y-0.5">
                                        {ca.strongPoints.map((s) => (
                                          <li key={s}>{s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                {Array.isArray(ca.weakPoints) &&
                                  ca.weakPoints.length > 0 && (
                                    <div>
                                      <p className="font-semibold text-slate-800 mb-1">
                                        Gaps
                                      </p>
                                      <ul className="list-disc pl-4 space-y-0.5">
                                        {ca.weakPoints.map((s) => (
                                          <li key={s}>{s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                {Array.isArray(ca.uniqueSellingPoints) &&
                                  ca.uniqueSellingPoints.length > 0 && (
                                    <div className="md:col-span-2">
                                      <p className="font-semibold text-slate-800 mb-1">
                                        Differentiators
                                      </p>
                                      <ul className="list-disc pl-4 space-y-0.5">
                                        {ca.uniqueSellingPoints.map((s) => (
                                          <li key={s}>{s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                    {currentResult.recommendations &&
                      typeof currentResult.recommendations === "object" &&
                      !Array.isArray(currentResult.recommendations) && (
                        <RecommendationsPanel
                          recommendations={
                            currentResult.recommendations as unknown as RecommendationBuckets
                          }
                        />
                      )}
                    {Array.isArray(currentResult.recommendations) &&
                      currentResult.recommendations.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                          <p className="font-semibold text-xs uppercase text-slate-500 mb-2">
                            Insights
                          </p>
                          <ul className="list-disc pl-4 space-y-1">
                            {currentResult.recommendations.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {typeof currentResult.tailoredSummary === "string" && (
                      <TailoredSummaryCard
                        summary={currentResult.tailoredSummary}
                        topMissingKeywordsToAdd={
                          Array.isArray(currentResult.topMissingKeywordsToAdd)
                            ? (currentResult.topMissingKeywordsToAdd as string[])
                            : []
                        }
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
