"use client";

import { useEffect, useMemo } from "react";
import { useJobATSStore } from "@/store/useJobATSStore";
import { JobListingsBoard } from "./JobListingsBoard";
import { ATSScoreModal } from "./ATSScoreModal";

export function JobATSPage() {
  const { listings, loadListings } = useJobATSStore();

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const categoryCount = useMemo(
    () => new Set(listings.map((l) => l.category)).size,
    [listings]
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="relative overflow-hidden bg-white border-b border-gray-100 px-4 sm:px-8 py-8">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none opacity-90"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl" aria-hidden>
              {"\u{1F3AF}"}
            </span>
            <h1 className="text-3xl font-black text-gray-900">Job ATS Scorer</h1>
          </div>
          <p className="text-gray-500 text-sm max-w-xl">
            Select any job below to instantly see how your resume scores. Get
            keyword gaps, section analysis, and AI-powered improvements.
          </p>
          <div className="flex flex-wrap gap-6 mt-4">
            {[
              { label: "Jobs available", value: listings.length },
              { label: "Categories", value: categoryCount },
              { label: "Avg match time", value: "~15s" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <span className="text-lg font-bold text-violet-600">
                  {stat.value}
                </span>
                <span className="text-xs text-gray-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        <JobListingsBoard />
      </div>

      <ATSScoreModal />
    </div>
  );
}
