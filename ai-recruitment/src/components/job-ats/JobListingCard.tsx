"use client";

import { motion } from "framer-motion";
import type { JobListing } from "@/store/useJobATSStore";
import { useJobATSStore } from "@/store/useJobATSStore";

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: "bg-blue-100 text-blue-700",
  Backend: "bg-green-100 text-green-700",
  "Full Stack": "bg-violet-100 text-violet-700",
  Mobile: "bg-pink-100 text-pink-700",
  DevOps: "bg-orange-100 text-orange-700",
  Cloud: "bg-sky-100 text-sky-700",
  "ML/AI": "bg-purple-100 text-purple-700",
  Data: "bg-amber-100 text-amber-700",
  "Data Science": "bg-yellow-100 text-yellow-700",
  Security: "bg-red-100 text-red-700",
  Blockchain: "bg-teal-100 text-teal-700",
  "QA/Testing": "bg-indigo-100 text-indigo-700",
  SRE: "bg-rose-100 text-rose-700",
  "Platform Engineering": "bg-cyan-100 text-cyan-700",
  "Developer Relations": "bg-lime-100 text-lime-700",
};

const SCORE_COLOR = (score: number) =>
  score >= 80
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 65
      ? "text-blue-600 bg-blue-50 border-blue-200"
      : score >= 50
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-red-600 bg-red-50 border-red-200";

export function JobListingCard({ job }: { job: JobListing }) {
  const { selectJob, scoringJobId } = useJobATSStore();
  const isScoring = scoringJobId === job.id;
  const hasScore = !!job.existingScore;

  return (
    <motion.div
      layout
      whileHover={{
        y: -3,
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
      }}
      className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 h-full ${
        job.is_featured
          ? "border-violet-200 ring-1 ring-violet-100"
          : "border-gray-100"
      }`}
      onClick={() => selectJob(job)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {job.is_featured && (
              <span className="text-xs bg-violet-600 text-white rounded-full px-2 py-0.5 font-semibold">
                Featured
              </span>
            )}
            <span
              className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                CATEGORY_COLORS[job.category] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {job.category}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight">
            {job.job_title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{job.company_name}</p>
        </div>

        {hasScore && (
          <div
            className={`flex-shrink-0 text-center rounded-xl px-3 py-1.5 border text-xs font-bold ${SCORE_COLOR(job.existingScore!.score)}`}
          >
            <div className="text-lg leading-none">{job.existingScore!.score}</div>
            <div className="text-xs opacity-70">ATS</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
        <span>{job.location}</span>
        <span>•</span>
        <span>{job.job_type}</span>
        <span>•</span>
        <span>{job.experience_level}</span>
        {job.salary_range && (
          <>
            <span>•</span>
            <span className="text-emerald-600 font-medium">{job.salary_range}</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {(job.tech_stack ?? []).slice(0, 5).map((tech) => (
          <span
            key={tech}
            className="text-xs bg-gray-100 text-gray-600 rounded-lg px-2 py-0.5 font-mono"
          >
            {tech}
          </span>
        ))}
        {(job.tech_stack ?? []).length > 5 && (
          <span className="text-xs text-gray-400">
            +{(job.tech_stack ?? []).length - 5} more
          </span>
        )}
      </div>

      <div className="mt-auto pt-2 border-t border-gray-50">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={(e) => {
            e.stopPropagation();
            selectJob(job);
          }}
          disabled={isScoring}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            hasScore
              ? "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
              : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
          }`}
        >
          {isScoring ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Calculating...
            </>
          ) : hasScore ? (
            <>View score & details</>
          ) : (
            <>Check ATS score</>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
