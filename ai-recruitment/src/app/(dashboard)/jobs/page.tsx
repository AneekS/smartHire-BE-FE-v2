"use client";

import { JobSearch } from "@/components/jobs/JobSearch";

export default function JobsPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Smart Job Search</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Discover high-match roles with AI-powered readiness insights.
        </p>
      </div>
      <JobSearch />
    </div>
  );
}
