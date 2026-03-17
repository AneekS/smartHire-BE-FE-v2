// src/store/useJobATSStore.ts
// RULE: This file is browser-only.
// NEVER import insforge, prisma, or any server lib here.
// ONLY use fetch() to call API routes.

import { create } from "zustand";

interface KeywordPresent {
  keyword: string;
  frequency: number;
  context: string;
  importance: "critical" | "important" | "nice_to_have";
}

interface KeywordMissing {
  keyword: string;
  importance: "critical" | "important" | "nice_to_have";
  suggestion: string;
  section: string;
}

interface BreakdownItem {
  score: number;
  weight: number;
  reason: string;
}

interface RecommendationItem {
  priority: number;
  action: string;
  impact: string;
  example: string;
}

interface QuickWin {
  action: string;
  timeToImplement: string;
  impact: string;
}

export interface JobATSResult {
  id?: string;
  jobTitle: string;
  companyName: string;
  overallScore: number;
  scoreLabel: string;
  matchSummary: string;
  breakdown: Record<string, BreakdownItem>;
  keywordAnalysis: {
    present: KeywordPresent[];
    missing: KeywordMissing[];
    partialMatch: Array<{
      jdKeyword: string;
      resumeVariant: string;
      recommendation: string;
    }>;
  };
  sectionScores: Record<string, any>;
  recommendations: {
    critical: RecommendationItem[];
    important: RecommendationItem[];
    quickWins: QuickWin[];
  };
  competitiveAnalysis: {
    strongPoints: string[];
    weakPoints: string[];
    uniqueSellingPoints: string[];
    estimatedPassRate: string;
  };
  tailoredSummary: string;
  topMissingKeywordsToAdd: string[];
  cached?: boolean;
  resumeFileName?: string;
}

export interface ScoreHistoryItem {
  id: string;
  jobTitle: string;
  companyName: string;
  overallScore: number;
  matchSummary: string;
  createdAt: string;
}

interface JobATSStore {
  currentResult: JobATSResult | null;
  scoreHistory: ScoreHistoryItem[];
  isLoading: boolean;
  historyLoading: boolean;
  error: string | null;
  activeHistoryId: string | null;

  analyzeJob: (
    jobTitle: string,
    companyName: string,
    jobDescription: string
  ) => Promise<void>;

  loadHistory: () => Promise<void>;
  selectHistoryItem: (item: ScoreHistoryItem) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
}

export const useJobATSStore = create<JobATSStore>((set, get) => ({
  currentResult: null,
  scoreHistory: [],
  isLoading: false,
  historyLoading: false,
  error: null,
  activeHistoryId: null,

  // ── ANALYZE JOB ────────────────────────────────────────────────
  // Uses fetch() → POST /api/v1/jobs/ats-score (server API route)
  // The API route handles InsForge internally
  analyzeJob: async (jobTitle, companyName, jobDescription) => {
    set({ isLoading: true, error: null, currentResult: null });

    try {
      const res = await fetch("/api/v1/jobs/ats-score", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, companyName, jobDescription }),
      });

      const json = await res.json().catch(() => ({
        success: false,
        error: `HTTP ${res.status}`,
      }));

      if (!res.ok || !json.success) {
        throw new Error(
          json.error ?? `Request failed with status ${res.status}`
        );
      }

      if (!json.data) {
        throw new Error("API returned success but no data");
      }

      set({
        currentResult: json.data,
        isLoading: false,
        activeHistoryId: json.data.id ?? null,
      });

      get().loadHistory();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Analysis failed";
      set({ error: msg, isLoading: false });
    }
  },

  // ── LOAD HISTORY ───────────────────────────────────────────────
  // Uses fetch() → GET /api/v1/jobs/ats-score (server API route)
  // Never calls InsForge directly
  loadHistory: async () => {
    set({ historyLoading: true });

    try {
      const res = await fetch("/api/v1/jobs/ats-score", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        set({ historyLoading: false });
        return;
      }

      const json = await res.json().catch(() => ({ success: false, data: [] }));

      set({
        scoreHistory: json.data ?? [],
        historyLoading: false,
      });
    } catch {
      set({ historyLoading: false });
    }
  },

  // ── SELECT HISTORY ITEM ────────────────────────────────────────
  // Fetches full detail from GET /api/v1/jobs/ats-score/:id
  selectHistoryItem: async (item: ScoreHistoryItem) => {
    set({ activeHistoryId: item.id });
    try {
      const res = await fetch(`/api/v1/jobs/ats-score/${item.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          set({ currentResult: json.data });
        }
      }
    } catch {
      // Non-blocking; keep selection state
    }
  },

  clearResult: () => set({ currentResult: null, error: null }),
  clearError: () => set({ error: null }),
}));
