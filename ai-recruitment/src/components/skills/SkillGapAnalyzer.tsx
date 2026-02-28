"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSkillGap } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SkillGapAnalyzer() {
  const { gaps, loading, analyze } = useSkillGap();
  const [targetRole, setTargetRole] = useState("Software Engineer");

  const handleAnalyze = () => {
    analyze(targetRole);
  };

  return (
    <Card className="rounded-3xl border-slate-200/60 p-6 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Target className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Skill Gap Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare your skills to your target role
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="e.g. Frontend Engineer, Data Scientist"
          className="rounded-xl flex-1"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
        />
        <Button
          className="rounded-xl"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <span className="animate-pulse">Analyzing...</span>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {!loading && gaps && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Readiness Score
            </span>
            <span
              className={cn(
                "text-2xl font-bold",
                gaps.readiness_score >= 76 ? "text-emerald-500" : gaps.readiness_score >= 51 ? "text-amber-500" : "text-rose-500"
              )}
            >
              {gaps.readiness_score}%
            </span>
          </div>

          {gaps.readiness_label && (
            <Badge variant="secondary" className="text-xs">
              {gaps.readiness_label}
            </Badge>
          )}

          {gaps.strong_skills && gaps.strong_skills.length > 0 && (
            <div>
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Skills You Have
              </h4>
              <div className="flex flex-wrap gap-2">
                {gaps.strong_skills.map((s) => (
                  <Badge
                    key={s}
                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {gaps.missing_skills && gaps.missing_skills.length > 0 && (
            <div>
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <XCircle className="h-4 w-4" />
                Skills You Need
              </h4>
              <ul className="space-y-3">
                {gaps.missing_skills.map((m, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {m.skill}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          m.priority === "HIGH" && "border-rose-500 text-rose-600"
                        )}
                      >
                        {m.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.reason}
                    </p>
                    {m.learning_resources && m.learning_resources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.learning_resources.slice(0, 3).map((r, j) => (
                          <a
                            key={j}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline"
                          >
                            {r.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gaps.summary && (
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
              {gaps.summary}
            </p>
          )}
        </motion.div>
      )}

      {!loading && !gaps && (
        <p className="text-sm text-slate-500 text-center py-8">
          Enter a target role and click Analyze to see your skill gaps. Upload a resume first for best results.
        </p>
      )}
    </Card>
  );
}
