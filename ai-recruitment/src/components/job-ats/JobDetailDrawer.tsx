"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ListingDetail = {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string | null;
  tech_stack: string[];
  category: string;
  job_description: string;
  requirements: string;
  responsibilities: string;
  nice_to_have: string | null;
};

export function JobDetailDrawer({
  jobId,
  open,
  onClose,
}: {
  jobId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !jobId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/jobs/listings/${jobId}`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? "Failed to load job");
        }
        if (!cancelled) setDetail(json.data as ListingDetail);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, jobId]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer overlay"
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className="fixed top-0 right-0 z-[70] h-full w-full max-w-lg bg-white shadow-2xl border-l border-gray-100 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Full job description</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-700 space-y-4">
              {loading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-6 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-40 bg-gray-100 rounded" />
                </div>
              )}
              {error && <p className="text-red-600 text-sm">{error}</p>}
              {detail && !loading && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                      {detail.category}
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">
                      {detail.job_title}
                    </h3>
                    <p className="text-gray-500">{detail.company_name}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {detail.location} · {detail.job_type} · {detail.experience_level}
                      {detail.salary_range ? ` · ${detail.salary_range}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(detail.tech_stack ?? []).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-gray-100 rounded px-2 py-0.5 font-mono text-gray-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <section>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">
                      Overview
                    </h4>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {detail.job_description}
                    </p>
                  </section>
                  <section>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">
                      Requirements
                    </h4>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {detail.requirements}
                    </p>
                  </section>
                  <section>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">
                      Responsibilities
                    </h4>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {detail.responsibilities}
                    </p>
                  </section>
                  {detail.nice_to_have?.trim() && (
                    <section>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">
                        Nice to have
                      </h4>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {detail.nice_to_have}
                      </p>
                    </section>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
