"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJobATSStore } from "@/store/useJobATSStore";
import { JobListingCard } from "./JobListingCard";
import { CategoryFilterBar } from "./CategoryFilterBar";
import { JobSearchBar } from "./JobSearchBar";

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

export function JobListingsBoard() {
  const { listings, isLoadingListings } = useJobATSStore();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(() => {
    const acc: Record<string, number> = { All: listings.length };
    for (const job of listings) {
      acc[job.category] = (acc[job.category] ?? 0) + 1;
    }
    return acc;
  }, [listings]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return listings.filter((job) => {
      const matchesCategory =
        activeCategory === "All" || job.category === activeCategory;
      const matchesSearch =
        !q ||
        job.job_title.toLowerCase().includes(q) ||
        job.company_name.toLowerCase().includes(q) ||
        job.tech_stack?.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [listings, activeCategory, searchQuery]);

  if (isLoadingListings) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3">
        <JobSearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <CategoryFilterBar
        categories={CATEGORIES}
        active={activeCategory}
        onChange={setActiveCategory}
        counts={counts}
      />

      <p className="text-xs text-gray-400 font-medium">
        {filtered.length} {filtered.length === 1 ? "role" : "roles"} found
        {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
      </p>

      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((job, i) => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <JobListingCard job={job} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No jobs found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      )}
    </div>
  );
}
