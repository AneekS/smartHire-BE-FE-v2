// Browser-only: use fetch() to API routes; never import server libs.
import { create } from "zustand";
import { ATSResponseTransformer } from "@/lib/transformers/ATSResponseTransformer";
import type { JobAtsScore } from "@/types/ats.types";
import type { JobListing as JobListingType } from "@/types/job.types";

function normalizeAtsPayload(data: unknown): JobATSResult {
  const normalized = ATSResponseTransformer.toClientAts(data);
  return { ...normalized, ...((data as Record<string, unknown>) ?? {}) };
}

export type JobListing = JobListingType;

export interface ScoreComponentBreakdownUI {
  score: number;
  weight: number;
  contribution: number;
  reason: string;
  matched?: string[];
  missing?: string[];
  bonus?: string[];
}

/** Unified ATS result — alias of JobAtsScore with legacy API fields. */
export type JobATSResult = Partial<JobAtsScore> & {
  id?: string;
  overallScore?: number;
  finalScore?: number;
  dealbreakers?: string[];
  flags?: string[];
  topStrengths?: string[];
  topGaps?: string[];
  recommendations?: string[] | Record<string, unknown>;
};

interface JobATSStore {
  listings: JobListing[];
  isLoadingListings: boolean;
  selectedJob: JobListing | null;
  scoringJobId: string | null;
  currentResult: JobATSResult | null;
  isScoring: boolean;
  isLoadingDetail: boolean;
  scoringError: string | null;
  showScoreModal: boolean;

  loadListings: () => Promise<void>;
  selectJob: (job: JobListing) => Promise<void>;
  scoreJob: (job: JobListing) => Promise<void>;
  closeModal: () => void;
}

export const useJobATSStore = create<JobATSStore>((set, get) => ({
  listings: [],
  isLoadingListings: false,
  selectedJob: null,
  scoringJobId: null,
  currentResult: null,
  isScoring: false,
  isLoadingDetail: false,
  scoringError: null,
  showScoreModal: false,

  loadListings: async () => {
    set({ isLoadingListings: true });
    try {
      const res = await fetch("/api/v1/jobs/listings", { credentials: "include" });
      const json = await res.json().catch(() => ({ success: false, data: [] }));
      if (!res.ok || !json.success) {
        if (process.env.NODE_ENV === "development") {
          console.warn("loadListings:", json.error ?? res.status);
        }
        set({ listings: [], isLoadingListings: false });
        return;
      }
      set({ listings: json.data ?? [], isLoadingListings: false });
    } catch {
      set({ listings: [], isLoadingListings: false });
    }
  },

  selectJob: async (job: JobListing) => {
    set({
      selectedJob: job,
      showScoreModal: true,
      scoringError: null,
    });

    const hasCached =
      job.existingScore != null &&
      typeof job.existingScore.score === "number";

    if (hasCached) {
      set({
        isLoadingDetail: true,
        currentResult: null,
        isScoring: false,
        scoringJobId: null,
      });
      try {
        const res = await fetch(
          `/api/v1/jobs/ats-score?job_listing_id=${encodeURIComponent(job.id)}`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          set({
            currentResult: normalizeAtsPayload(json.data),
            isLoadingDetail: false,
          });
          return;
        }
      } catch {
        /* fall through to scoreJob */
      }
      set({ isLoadingDetail: false });
    }

    await get().scoreJob(job);
  },

  scoreJob: async (job: JobListing) => {
    set({
      isScoring: true,
      scoringJobId: job.id,
      scoringError: null,
      currentResult: null,
      showScoreModal: true,
      isLoadingDetail: false,
    });

    try {
      const res = await fetch("/api/v1/jobs/ats-score", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_listing_id: job.id }),
      });

      const json = await res.json().catch(() => ({
        success: false,
        error: `HTTP ${res.status}`,
      }));

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Error ${res.status}`);
      }

      const result = normalizeAtsPayload(json.data);
      set({
        currentResult: result,
        isScoring: false,
        scoringJobId: null,
      });

      const overall =
        typeof result.overallScore === "number"
          ? result.overallScore
          : (json.data?.overallScore as number | undefined);
      const label = (json.data?.scoreLabel as string | null) ?? null;
      if (typeof overall === "number") {
        set((state) => ({
          listings: state.listings.map((l) =>
            l.id === job.id
              ? {
                  ...l,
                  existingScore: { score: overall, label },
                }
              : l
          ),
        }));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Scoring failed";
      set({
        scoringError: msg,
        isScoring: false,
        scoringJobId: null,
      });
    }
  },

  closeModal: () =>
    set({
      showScoreModal: false,
      currentResult: null,
      selectedJob: null,
      scoringError: null,
      isLoadingDetail: false,
      isScoring: false,
      scoringJobId: null,
    }),
}));
