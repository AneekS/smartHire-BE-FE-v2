"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSkillGapStore } from "@/store/useSkillGapStore";
import { TargetRoleResults } from "./TargetRoleResults";

interface JobListing {
  id: string;
  job_title: string;
  company_name: string;
  category: string;
  tech_stack: string[];
  experience_level: string;
  location: string;
  salary_range: string | null;
  is_featured: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Frontend: "\u269B\uFE0F",
  Backend: "\u2699\uFE0F",
  "Full Stack": "\u{1F537}",
  Mobile: "\u{1F4F1}",
  DevOps: "\u{1F527}",
  Cloud: "\u2601\uFE0F",
  "ML/AI": "\u{1F916}",
  Data: "\u{1F4CA}",
  "Data Science": "\u{1F52C}",
  Security: "\u{1F6E1}\uFE0F",
  Blockchain: "\u26D3\uFE0F",
  "QA/Testing": "\u{1F9EA}",
  SRE: "\u{1F50D}",
  "Platform Engineering": "\u{1F3D7}\uFE0F",
  "Developer Relations": "\u{1F4E2}",
};

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: "bg-blue-50 border-blue-200 text-blue-700",
  Backend: "bg-green-50 border-green-200 text-green-700",
  "Full Stack": "bg-violet-50 border-violet-200 text-violet-700",
  Mobile: "bg-pink-50 border-pink-200 text-pink-700",
  DevOps: "bg-orange-50 border-orange-200 text-orange-700",
  Cloud: "bg-sky-50 border-sky-200 text-sky-700",
  "ML/AI": "bg-purple-50 border-purple-200 text-purple-700",
  Data: "bg-amber-50 border-amber-200 text-amber-700",
  "Data Science": "bg-yellow-50 border-yellow-200 text-yellow-700",
  Security: "bg-red-50 border-red-200 text-red-700",
  Blockchain: "bg-teal-50 border-teal-200 text-teal-700",
  "QA/Testing": "bg-indigo-50 border-indigo-200 text-indigo-700",
  SRE: "bg-rose-50 border-rose-200 text-rose-700",
  "Platform Engineering": "bg-cyan-50 border-cyan-200 text-cyan-700",
  "Developer Relations": "bg-lime-50 border-lime-200 text-lime-700",
};

const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "staff"] as const;

const CATEGORIES = [
  "All",
  "Frontend",
  "Backend",
  "Full Stack",
  "Mobile",
  "DevOps",
  "Cloud",
  "ML/AI",
  "Data",
  "Data Science",
  "Security",
  "Blockchain",
  "QA/Testing",
  "SRE",
  "Platform Engineering",
  "Developer Relations",
];

export function TargetRoleExplorer() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobListing[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [experienceLevel, setExperienceLevel] =
    useState<(typeof EXPERIENCE_LEVELS)[number]>("mid");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  const {
    analyzeTargetRole,
    targetAnalysis,
    targetAnalysisLoading,
    targetAnalysisError,
  } = useSkillGapStore();

  useEffect(() => {
    async function loadJobs() {
      setIsLoadingJobs(true);
      try {
        const res = await fetch("/api/v1/jobs/listings", {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({
          success: false,
          data: [],
        }));
        if (json.success && Array.isArray(json.data)) {
          setJobs(json.data);
          setFilteredJobs(json.data);
        }
      } catch (e) {
        console.error("Failed to load job listings:", e);
      } finally {
        setIsLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  useEffect(() => {
    let result = jobs;
    if (activeCategory !== "All") {
      result = result.filter((j) => j.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.job_title.toLowerCase().includes(q) ||
          j.company_name.toLowerCase().includes(q) ||
          j.tech_stack?.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    setFilteredJobs(result);
  }, [jobs, activeCategory, searchQuery]);

  const handleSelectJob = (job: JobListing) => {
    useSkillGapStore.setState({
      targetAnalysis: null,
      targetAnalysisError: null,
    });
    setSelectedJob(job);
  };

  const handleAnalyze = async () => {
    if (!selectedJob) return;

    await analyzeTargetRole(
      selectedJob.job_title,
      experienceLevel,
      selectedJob.id
    );

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Your experience level
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Calibrates expectations alongside the job posting
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setExperienceLevel(level)}
                className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-all ${
                  experienceLevel === level
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search roles, companies, or technologies..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
        />

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-violet-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-violet-300"
              }`}
            >
              {CATEGORY_EMOJI[cat] ? `${CATEGORY_EMOJI[cat]} ` : ""}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoadingJobs ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-400">
              {filteredJobs.length} roles available
              {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
            </p>
            {selectedJob && (
              <p className="text-xs font-semibold text-violet-600">
                Selected: {selectedJob.job_title}
              </p>
            )}
          </div>

          <motion.div
            layout
            className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredJobs.map((job, i) => (
                <motion.button
                  key={job.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  whileHover={{
                    y: -3,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectJob(job)}
                  className={`relative flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    selectedJob?.id === job.id
                      ? "border-violet-400 bg-violet-50 shadow-md ring-2 ring-violet-200"
                      : "border-gray-100 bg-white hover:border-violet-200"
                  }`}
                >
                  {job.is_featured && (
                    <span className="absolute right-2 top-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-xs font-bold text-white">
                      {"\u2605"}
                    </span>
                  )}

                  <span
                    className={`w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${
                      CATEGORY_COLORS[job.category] ??
                      "border-gray-200 bg-gray-100 text-gray-600"
                    }`}
                  >
                    {CATEGORY_EMOJI[job.category] ?? "\u{1F4BC}"}{" "}
                    {job.category}
                  </span>

                  <div>
                    <p className="text-sm font-bold leading-tight text-gray-900">
                      {job.job_title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {job.company_name}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(job.tech_stack ?? []).slice(0, 3).map((tech: string) => (
                      <span
                        key={tech}
                        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600"
                      >
                        {tech}
                      </span>
                    ))}
                    {(job.tech_stack ?? []).length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{(job.tech_stack ?? []).length - 3}
                      </span>
                    )}
                  </div>

                  {selectedJob?.id === job.id && (
                    <div className="flex items-center gap-1 text-violet-600">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600">
                        <span className="text-xs text-white">{"\u2713"}</span>
                      </div>
                      <span className="text-xs font-semibold">Selected</span>
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredJobs.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">
                No roles found. Try a different search or category.
              </p>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-4 z-10"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">
                  Analyzing against your resume
                </p>
                <p className="truncate text-sm font-bold text-gray-900">
                  {selectedJob.job_title}
                  <span className="font-normal text-gray-400">
                    {" "}
                    @ {selectedJob.company_name}
                  </span>
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAnalyze}
                disabled={targetAnalysisLoading}
                className={`flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all sm:w-auto ${
                  targetAnalysisLoading
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "bg-violet-600 text-white shadow-md hover:bg-violet-700"
                }`}
              >
                {targetAnalysisLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Analyzing...
                  </>
                ) : (
                  <>Analyze skill gap</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {targetAnalysisError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm text-red-600">{targetAnalysisError}</p>
        </div>
      )}

      <AnimatePresence>
        {targetAnalysisLoading && selectedJob && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-violet-100 border-t-violet-600" />
            <p className="font-semibold text-gray-800">
              Analyzing your resume against{" "}
              <span className="text-violet-600">{selectedJob.job_title}</span>
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Reading your resume, JD requirements, and skill gaps...
            </p>
            <p className="mt-2 text-xs text-gray-300">About 15 seconds</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={resultsRef}>
        <AnimatePresence>
          {!targetAnalysisLoading && targetAnalysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {targetAnalysis.resumeFileName && (
                <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Analyzed from: {targetAnalysis.resumeFileName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {targetAnalysis.cached
                      ? "Cached result"
                      : "Fresh analysis"}
                  </span>
                </div>
              )}
              <TargetRoleResults
                analysis={targetAnalysis}
                targetRole={selectedJob?.job_title ?? ""}
                companyName={
                  selectedJob?.company_name ??
                  targetAnalysis.companyName ??
                  ""
                }
                experienceLevel={experienceLevel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!selectedJob && !targetAnalysis && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Select a job role above for a personalized skill gap analysis based
            on your uploaded resume.
          </p>
          <a
            href="/resume"
            className="mt-1 inline-block text-xs font-medium text-violet-600 hover:underline"
          >
            No resume yet? Upload in Resume Optimizer
          </a>
        </div>
      )}
    </div>
  );
}
