"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useResumeStore } from "@/store/useResumeStore";
import { useSkillGapStore } from "@/store/useSkillGapStore";
import { Button } from "@/components/ui/button";
import { SkillRadarChart } from "./SkillRadarChart";
import { SkillsYouHaveGrid } from "./SkillsYouHaveGrid";
import { CriticalGapsList } from "./CriticalGapsList";
import { PartialSkillsList } from "./PartialSkillsList";
import { ResourceDrawer } from "./ResourceDrawer";
import type { GapAnalysis } from "@/store/useSkillGapStore";
import { CheckCircle2, Zap, Clock } from "lucide-react";

const panelVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const statsContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const statCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function getCounts(analysis: GapAnalysis | null) {
  if (!analysis) {
    return { readiness: 0, have: 0, gaps: 0, months: 3 };
  }
  const readiness = analysis.roleMatchScore ?? 0;
  const have = analysis.skillsYouHave?.length ?? 0;
  const gaps = analysis.criticalGaps?.length ?? 0;
  const months = Math.max(1, Math.round((analysis.estimatedWeeksToReady ?? 12) / 4));
  return { readiness, have, gaps, months };
}

function roleReadyColor(score: number) {
  if (score < 50) return "text-red-500";
  if (score < 70) return "text-amber-600";
  if (score < 85) return "text-violet-600";
  return "text-emerald-600";
}

export function ResumeSkillAnalysis() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const { originalContent, loadResumeFromAPI } = useResumeStore();
  const {
    resumeAnalysis,
    resumeAnalysisLoading,
    resumeAnalysisError,
    resumeLastAnalyzedAt,
    analyzeFromResume,
  } = useSkillGapStore();

  const hasResume = !!originalContent;
  const { readiness, have, gaps, months } = getCounts(resumeAnalysis);

  const lastAnalyzedLabel = useMemo(() => {
    if (!resumeLastAnalyzedAt) return null;
    const ts = new Date(resumeLastAnalyzedAt);
    const diffMs = Date.now() - ts.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }, [resumeLastAnalyzedAt]);

  if (!hasResume) {
    return (
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Upload your resume to get started</CardTitle>
          <CardDescription className="text-gray-500">
            We&apos;ll parse your resume, detect your skills, and compare them against current market expectations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={loadResumeFromAPI} className="rounded-lg bg-violet-600 hover:bg-violet-700">
            Check for existing resume
          </Button>
          <Button size="sm" variant="outline" asChild className="rounded-lg border-violet-200 text-violet-600 hover:bg-violet-50">
            <a href="/resume">Go to Resume Optimizer →</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (resumeAnalysisError && !resumeAnalysis) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-red-700">Analysis failed</CardTitle>
          <CardDescription className="text-red-600/80">{resumeAnalysisError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            onClick={analyzeFromResume}
            disabled={resumeAnalysisLoading}
            className="rounded-lg bg-violet-600 hover:bg-violet-700"
          >
            {resumeAnalysisLoading ? "Re-analyzing..." : "Re-analyze resume"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        variants={statsContainerVariants}
        initial="hidden"
        animate="visible"
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div
          variants={statCardVariants}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Role Ready</p>
              <p className={`mt-1 text-4xl font-bold tabular-nums ${roleReadyColor(readiness)}`}>{readiness}%</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={statCardVariants}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Skills You Have</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-emerald-600">{have}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={statCardVariants}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Critical Gaps</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-red-500">{gaps}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-500">
              <Zap className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={statCardVariants}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Time to Job Ready</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-amber-600">{months}-{months + 1}m</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        ref={resultsRef}
        className="grid gap-8 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      >
        <motion.div variants={panelVariants}>
          <SkillRadarChart analysis={resumeAnalysis} loading={resumeAnalysisLoading} />
        </motion.div>
        <motion.div variants={panelVariants} className="space-y-4">
          <SkillsYouHaveGrid analysis={resumeAnalysis} loading={resumeAnalysisLoading} />
          <CriticalGapsList analysis={resumeAnalysis} loading={resumeAnalysisLoading} />
          <PartialSkillsList analysis={resumeAnalysis} loading={resumeAnalysisLoading} />
          {lastAnalyzedLabel && (
            <p className="text-xs text-gray-400">
              Last analyzed {lastAnalyzedLabel}.{" "}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-violet-600 underline-offset-2 hover:underline"
                onClick={analyzeFromResume}
                disabled={resumeAnalysisLoading}
              >
                Re-analyze
              </Button>
            </p>
          )}
        </motion.div>
      </motion.div>
      <ResourceDrawer />
    </>
  );
}
