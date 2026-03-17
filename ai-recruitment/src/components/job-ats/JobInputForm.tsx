"use client";

import { useState } from "react";
import { useJobATSStore } from "@/store/useJobATSStore";

export function JobInputForm() {
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const { analyzeJob, isLoading, error } = useJobATSStore();

  const charCount = jobDescription.length;
  const isReady = jobTitle.trim() && jobDescription.trim().length >= 100;

  const handleAnalyze = async () => {
    if (!isReady) return;
    await analyzeJob(jobTitle, companyName, jobDescription);
    const el = document.getElementById("job-ats-result-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Analyze a Job Posting</h2>
      <p className="text-sm text-gray-400 mb-5">
        Paste any job description to get your personalized ATS score
      </p>

      <label className="block text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1.5">
        Job Title *
      </label>
      <input
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        placeholder="e.g. Senior Software Engineer"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
      />

      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
        Company Name (optional)
      </label>
      <input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="e.g. Google"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
      />

      <label className="block text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1.5">
        Job Description *
      </label>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder={`Paste the full job description here...

Include:
- Required skills and technologies
- Years of experience required
- Responsibilities
- Qualifications

The more complete the JD, the more accurate your ATS score.`}
        rows={12}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none mb-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 font-mono text-gray-700 leading-relaxed"
      />
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-xs ${
            charCount < 100 ? "text-red-400" : "text-gray-400"
          }`}
        >
          {charCount < 100
            ? `${100 - charCount} more characters needed`
            : `${charCount} characters — good length`}
        </span>
        {charCount > 0 && (
          <button
            onClick={() => setJobDescription("")}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!isReady || isLoading}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
          isReady && !isLoading
            ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Calculating ATS Score...
          </>
        ) : (
          <>🎯 Calculate ATS Score</>
        )}
      </button>
    </div>
  );
}

