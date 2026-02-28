"use client";

import { SkillGapAnalyzer } from "@/components/skills/SkillGapAnalyzer";

export default function SkillsPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Skill Gap Analysis
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Compare your current skills to your target role and get personalized recommendations.
          </p>
        </div>
        <SkillGapAnalyzer />
      </div>
    </div>
  );
}
