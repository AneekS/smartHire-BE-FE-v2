import { create } from "zustand";
import { ParsedResume } from "@/lib/services/ParserService";

export type ExperienceLevel = "entry" | "mid" | "senior" | "staff";

export interface GapAnalysisSkillRequired {
  name: string;
  category: string;
  priority: "critical" | "important" | "nice_to_have";
  demandScore: number;
}

export interface GapAnalysisSkillHave {
  name: string;
  proficiency: "beginner" | "intermediate" | "expert";
  meetsRequirement: boolean;
}

export interface GapAnalysisCriticalGap {
  skill: string;
  demandScore: number;
  estimatedWeeks: number;
  relevantRoles: string[];
}

export interface GapAnalysisPartialSkill {
  skill: string;
  currentLevel: "beginner" | "intermediate";
  requiredLevel: "intermediate" | "expert";
  gapSize: "small" | "medium" | "large";
}

export interface GapAnalysisDomainBreakdown {
  domain: string;
  matchPercent: number;
  status: "strong" | "partial" | "weak";
}

export interface GapAnalysisRadarPoint {
  domain: string;
  yourScore: number;
  marketDemand: number;
}

export interface GapAnalysisRoadmapResource {
  type: "video" | "docs" | "course" | "article";
  title: string;
  url: string;
  duration: string;
}

export interface GapAnalysisRoadmapItem {
  id: string;
  type: "learn" | "build" | "practice";
  title: string;
  estimatedWeeks: number;
  resources: GapAnalysisRoadmapResource[];
}

export interface GapAnalysisRoadmapPhase {
  phase: number;
  title: string;
  weeks: string;
  color: string;
  items: GapAnalysisRoadmapItem[];
}

export interface GapAnalysisRoadmap {
  phases: GapAnalysisRoadmapPhase[];
}

export interface GapAnalysis {
  roleMatchScore: number;
  estimatedWeeksToReady: number;
  difficultyLevel: "easy" | "moderate" | "hard" | "very_hard";
  skillsRequired: GapAnalysisSkillRequired[];
  skillsYouHave: GapAnalysisSkillHave[];
  criticalGaps: GapAnalysisCriticalGap[];
  partialSkills: GapAnalysisPartialSkill[];
  domainBreakdown: GapAnalysisDomainBreakdown[];
  radarData: GapAnalysisRadarPoint[];
  learningRoadmap: GapAnalysisRoadmap;
}

export interface SkillGapHistoryEntry {
  id: string;
  createdAt: string;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  analysis: GapAnalysis;
}

/** Normalize array from API (may be under different keys or shapes) */
function normalizeMissingSkills(raw: Record<string, unknown>): Array<{ skill: string; estimated_hours?: number; demand_score?: number }> {
  const from = (arr: unknown): Array<{ skill: string; estimated_hours?: number; demand_score?: number }> => {
    if (!Array.isArray(arr)) return [];
    return arr.map((m) => {
      if (typeof m === "string") return { skill: m, estimated_hours: 20, demand_score: 70 };
      if (m && typeof m === "object" && "skill" in m) {
        const o = m as { skill?: string; estimated_hours?: number; demand_score?: number };
        return {
          skill: String(o.skill ?? "Unknown"),
          estimated_hours: Number(o.estimated_hours) || 20,
          demand_score: typeof o.demand_score === "number" ? o.demand_score : 70,
        };
      }
      return { skill: "Unknown", estimated_hours: 20, demand_score: 70 };
    });
  };
  const data = raw.data as Record<string, unknown> | undefined;
  const missing =
    (raw.missing_skills as unknown) ??
    (raw.missingSkills as unknown) ??
    (data?.missing_skills as unknown) ??
    (data?.missingSkills as unknown);
  return from(missing);
}

/** Map legacy API response (readiness_score, missing_skills, strong_skills) to GapAnalysis */
function mapLegacyResponseToGapAnalysis(raw: Record<string, unknown>): GapAnalysis {
  const missing = normalizeMissingSkills(raw);
  const strongRaw = (raw.strong_skills ?? raw.strongSkills ?? (raw.data as Record<string, unknown>)?.strong_skills ?? (raw.data as Record<string, unknown>)?.strongSkills) as unknown;
  const strong = Array.isArray(strongRaw)
    ? strongRaw.map((s) => (typeof s === "string" ? s : String((s as { name?: string }).name ?? s)))
    : [];
  const score = Number(raw.readiness_score ?? raw.readinessScore ?? (raw.data as Record<string, unknown>)?.readiness_score) ?? 0;
  return {
    roleMatchScore: score,
    estimatedWeeksToReady: 12,
    difficultyLevel: "moderate",
    skillsRequired: [],
    skillsYouHave: strong.filter(Boolean).map((name) => ({
      name,
      proficiency: "intermediate" as const,
      meetsRequirement: true,
    })),
    criticalGaps: missing.map((m) => ({
      skill: m.skill,
      demandScore: typeof m.demand_score === "number" ? m.demand_score : 75,
      estimatedWeeks: Math.max(1, Math.ceil((m.estimated_hours ?? 20) / 5)),
      relevantRoles: [],
    })),
    partialSkills: [],
    domainBreakdown: [],
    radarData: [
      { domain: "Technical Skills", yourScore: Math.min(100, score + 10), marketDemand: 80 },
      { domain: "System Design", yourScore: Math.max(0, score - 10), marketDemand: 75 },
      { domain: "Communication", yourScore: Math.min(100, score + 5), marketDemand: 70 },
      { domain: "Leadership", yourScore: Math.max(0, score - 15), marketDemand: 60 },
      { domain: "Domain Knowledge", yourScore: score, marketDemand: 75 },
      { domain: "Tools & DevOps", yourScore: Math.max(0, score - 5), marketDemand: 80 },
    ],
    learningRoadmap: { phases: [] },
  };
}

interface SkillGapStore {
  // Tab 1 — Resume based
  resumeAnalysis: GapAnalysis | null;
  resumeAnalysisLoading: boolean;
  resumeAnalysisError: string | null;
  resumeLastAnalyzedAt: string | null;

  // Tab 2 — Target role
  targetRole: string;
  experienceLevel: ExperienceLevel;
  targetAnalysis: GapAnalysis | null;
  targetAnalysisLoading: boolean;
  targetAnalysisError: string | null;
  targetLastAnalyzedAt: string | null;

  // Roadmap progress
  completedItems: Set<string>;
  savedRoadmapId: string | null;

  // Resource drawer
  activeSkillDrawer: string | null;

  // History
  history: SkillGapHistoryEntry[];
  historyLoading: boolean;

  // Actions
  setTargetRole: (role: string) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;

  analyzeFromResume: () => Promise<void>;
  analyzeTargetRole: (role?: string, level?: ExperienceLevel) => Promise<void>;
  toggleItemComplete: (itemId: string, roadmapId?: string) => Promise<void>;
  saveRoadmap: (source: "resume" | "target") => Promise<void>;
  openResourceDrawer: (skill: string) => void;
  closeResourceDrawer: () => void;
  loadHistory: () => Promise<void>;
}

export const useSkillGapStore = create<SkillGapStore>((set, get) => ({
  // initial state
  resumeAnalysis: null,
  resumeAnalysisLoading: false,
  resumeAnalysisError: null,
  resumeLastAnalyzedAt: null,

  targetRole: "",
  experienceLevel: "mid",
  targetAnalysis: null,
  targetAnalysisLoading: false,
  targetAnalysisError: null,
  targetLastAnalyzedAt: null,

  completedItems: new Set<string>(),
  savedRoadmapId: null,

  activeSkillDrawer: null,

  history: [],
  historyLoading: false,

  setTargetRole(role) {
    set({ targetRole: role });
  },

  setExperienceLevel(level) {
    set({ experienceLevel: level });
  },

  async analyzeFromResume() {
    set({ resumeAnalysisLoading: true, resumeAnalysisError: null });
    try {
      const { targetRole, experienceLevel } = get();
      const res = await fetch("/api/v1/skills/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          source: "resume",
          targetRole: targetRole?.trim() || undefined,
          experienceLevel,
        }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        set({
          resumeAnalysisLoading: false,
          resumeAnalysisError:
            (json?.error as string) ?? "Failed to analyze resume",
        });
        return;
      }

      const raw = (json ?? {}) as Record<string, unknown>;
      const analysis = (raw.analysis as GapAnalysis) ?? mapLegacyResponseToGapAnalysis(raw);
      set({
        resumeAnalysis: analysis,
        resumeAnalysisLoading: false,
        resumeAnalysisError: null,
        resumeLastAnalyzedAt: json.lastAnalyzedAt ?? new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
      set({
        resumeAnalysisLoading: false,
        resumeAnalysisError: "Failed to analyze resume",
      });
    }
  },

  async analyzeTargetRole(roleArg, levelArg) {
    const { targetRole, experienceLevel } = get();
    const role = (roleArg ?? targetRole)?.trim?.() ?? "";
    const level = levelArg ?? experienceLevel;

    console.log("4. Store action called with:", { role, level });

    if (!role) {
      set({ targetAnalysisError: "Please enter a target role" });
      return;
    }

    set({
      targetRole: role,
      experienceLevel: level,
      targetAnalysis: null,
      targetAnalysisLoading: true,
      targetAnalysisError: null,
    });

    try {
      console.log("5. About to call API");
      const res = await fetch("/api/v1/skills/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          source: "manual",
          targetRole: role,
          experienceLevel: level,
        }),
      });

      console.log("6. API response status:", res.status);

      let json: Record<string, unknown> = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }
      console.log("7. API response keys:", Object.keys(json));

      if (!res.ok) {
        const errMsg = (json.error as string) ?? "Failed to analyze target role";
        set({
          targetAnalysisLoading: false,
          targetAnalysisError: errMsg,
          targetAnalysis: null,
        });
        return;
      }

      // Support both { success, data } and legacy { readiness_score, strong_skills, missing_skills }
      let analysis: GapAnalysis;
      const data = json.data as GapAnalysis | undefined;
      if (json.success === true && data) {
        analysis = data;
      } else {
        analysis = mapLegacyResponseToGapAnalysis(json);
      }

      console.log("8. Store updated, targetAnalysis:", {
        skillsYouHave: analysis.skillsYouHave?.length,
        criticalGaps: analysis.criticalGaps?.length,
        roleMatchScore: analysis.roleMatchScore,
      });

      set({
        targetAnalysis: analysis,
        targetAnalysisLoading: false,
        targetAnalysisError: null,
        targetLastAnalyzedAt: (json.lastAnalyzedAt as string) ?? new Date().toISOString(),
      });
    } catch (e) {
      console.error("analyzeTargetRole failed:", e);
      set({
        targetAnalysisLoading: false,
        targetAnalysisError: e instanceof Error ? e.message : "Failed to analyze target role",
        targetAnalysis: null,
      });
    }
  },

  async toggleItemComplete(itemId, roadmapId) {
    const { completedItems } = get();
    const next = new Set(completedItems);
    const newCompleted = !next.has(itemId);
    if (newCompleted) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }

    set({ completedItems: next });

    try {
      const res = await fetch("/api/v1/skills/roadmap-item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemId,
          completed: newCompleted,
          roadmapId,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("Failed to update roadmap item", json);
      }
    } catch (e) {
      console.error("Failed to update roadmap item", e);
    }
  },

  async saveRoadmap(source) {
    const { targetRole, experienceLevel, resumeAnalysis, targetAnalysis } = get();
    const analysis = source === "resume" ? resumeAnalysis : targetAnalysis;
    if (!analysis) return;

    try {
      const res = await fetch("/api/v1/skills/save-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetRole: source === "resume" ? undefined : targetRole,
          experienceLevel,
          roadmap: analysis.learningRoadmap,
          source,
        }),
      });

      const json = await res.json();
      if (res.ok && json.roadmapId) {
        set({ savedRoadmapId: json.roadmapId });
      }
    } catch (e) {
      console.error("Failed to save roadmap", e);
    }
  },

  openResourceDrawer(skill) {
    set({ activeSkillDrawer: skill });
  },

  closeResourceDrawer() {
    set({ activeSkillDrawer: null });
  },

  async loadHistory() {
    set({ historyLoading: true });
    try {
      const res = await fetch("/api/v1/skills/history", {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("Failed to load history", json);
        set({ historyLoading: false });
        return;
      }

      set({
        history: (json.history ?? []) as SkillGapHistoryEntry[],
        historyLoading: false,
      });
    } catch (e) {
      console.error("Failed to load history", e);
      set({ historyLoading: false });
    }
  },
}));

