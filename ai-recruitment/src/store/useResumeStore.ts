import { create } from "zustand";
import { ParsedResume } from "@/lib/services/ParserService";

export interface ScoreBreakdown {
    keywordMatch: number;
    formatting: number;
    experienceMatch: number;
    skillsAlignment: number;
}

export interface Improvement {
    id: string;
    severity: "critical" | "important" | "suggestion";
    section: string;
    fieldPath: string;
    title: string;
    description: string;
    originalText: string;
    suggestedText: string;
    impact: string;
    applied?: boolean; // track if applied
}

export interface AppliedFix {
    id: string;
    suggestionId: string;
    section: string;
    originalText: string;
    newText: string;
    appliedAt: Date;
    source: "ai" | "manual";
}

export interface ChangeLogEntry {
    id: string;
    timestamp: Date;
    section: string;
    description: string;
    fixId: string;
}

interface ResumeStore {
    resumeId: string | null;
    fileName: string | null;
    uploadedAt: string | null;

    originalContent: ParsedResume | null;
    updatedContent: ParsedResume | null;

    atsScore: number | null;
    scoreBreakdown: ScoreBreakdown | null;

    improvements: Improvement[];
    appliedFixes: AppliedFix[];
    changeLog: ChangeLogEntry[];

    isLoading: boolean;
    isUploading: boolean;
    error: string | null;
    uploadStage: "idle" | "uploading" | "extracting" | "parsing" | "scoring" | "suggesting" | "done";

    // Actions
    loadResumeFromAPI: () => Promise<void>;
    uploadResume: (file: File) => Promise<void>;
    applyFix: (fix: Improvement, newText?: string) => void;
    ignoreFix: (fixId: string) => void;
    applyAllFixes: () => void;
    undoFix: (fixId: string) => void;
    undoAll: () => void;
    updateSection: (section: string, value: unknown) => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
    resumeId: null,
    fileName: null,
    uploadedAt: null,
    originalContent: null,
    updatedContent: null,
    atsScore: null,
    scoreBreakdown: null,
    improvements: [],
    appliedFixes: [],
    changeLog: [],
    isLoading: false,
    isUploading: false,
    uploadStage: "idle",
    error: null,

    loadResumeFromAPI: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch("/api/resume", { credentials: "include" });
            if (!res.ok) throw new Error("API call failed");
            const json = await res.json();

            if (!json.data || !json.data.resumeId) {
                set({ isLoading: false, originalContent: null, updatedContent: null });
                return;
            }

            set({
                resumeId: json.data.resumeId,
                fileName: json.data.fileName,
                uploadedAt: json.data.uploadedAt,
                originalContent: json.data.parsed,
                updatedContent: json.data.parsed,
                atsScore: json.data.atsScore,
                scoreBreakdown: json.data.scoreBreakdown,
                improvements: json.data.improvements || [],
                isLoading: false,
            });
        } catch (e) {
            console.error(e);
            set({ error: "Failed to load resume", isLoading: false });
        }
    },

    uploadResume: async (file: File) => {
        set({ isUploading: true, error: null, uploadStage: "uploading" });
        try {
            // Simulate stages for UI
            setTimeout(() => set({ uploadStage: "extracting" }), 500);
            setTimeout(() => set({ uploadStage: "parsing" }), 1500);
            setTimeout(() => set({ uploadStage: "scoring" }), 4000);
            setTimeout(() => set({ uploadStage: "suggesting" }), 6000);

            const formData = new FormData();
            formData.append("resume", file);

            const res = await fetch("/api/resume", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (!res.ok) {
                let errorMessage = 'Upload failed';
                try {
                    const errData = await res.json();
                    errorMessage = errData.error || errData.message || `HTTP ${res.status}`;
                } catch {
                    errorMessage = `HTTP ${res.status}: ${res.statusText}`;
                }
                console.error('Upload failed:', errorMessage);
                set({ error: errorMessage, isUploading: false, uploadStage: 'idle' });
                return;
            }

            const json = await res.json();
            if (!json.data) {
                set({ error: 'Invalid response from server', isUploading: false, uploadStage: 'idle' });
                return;
            }

            const { data } = json;
            set({
                uploadStage: "done",
                resumeId: data.resumeId,
                fileName: data.fileName,
                uploadedAt: data.uploadedAt,
                originalContent: data.parsed,
                updatedContent: data.parsed,
                atsScore: data.atsScore,
                scoreBreakdown: data.scoreBreakdown,
                improvements: data.improvements || [],
                appliedFixes: [],
                changeLog: [],
                isUploading: false,
                error: null,
            });

            // reset stage after completion
            setTimeout(() => set({ uploadStage: "idle" }), 1000);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Network error";
            console.error("Upload exception:", message);
            set({ error: message, isUploading: false, uploadStage: "idle" });
        }
    },

    applyFix: (fix: Improvement, customNewText?: string) => {
        const { updatedContent, appliedFixes, changeLog, improvements, atsScore } = get();
        if (!updatedContent) return;

        const newText = customNewText ?? fix.suggestedText;

        // Simple deep copy
        const nextContent = JSON.parse(JSON.stringify(updatedContent));

        // fieldPath parsing. e.g "experience.0.bullets.2"
        let current = nextContent;
        const parts = fix.fieldPath.split(".");
        const lastPart = parts.pop();
        if (lastPart) {
            for (const p of parts) {
                current = current[p];
            }
            // Assuming it's a string, replace originalText with newText
            // or if it's an object with `text`, replace that.
            if (typeof current[lastPart] === "string") {
                current[lastPart] = current[lastPart].replace(fix.originalText, newText);
            } else if (current[lastPart] && current[lastPart].text) {
                current[lastPart].text = current[lastPart].text.replace(fix.originalText, newText);
            } else {
                // Fallback replacement logic if fieldPath is mismatched
                const replaceStringDeep = (obj: unknown): unknown => {
                    if (typeof obj === "string") return obj.replace(fix.originalText, newText);
                    if (Array.isArray(obj)) return obj.map(replaceStringDeep);
                    if (typeof obj === "object" && obj !== null) {
                        const res: Record<string, unknown> = {};
                        for (const k in obj as Record<string, unknown>) {
                            res[k] = (obj as Record<string, unknown>)[k] === fix.originalText ? newText : replaceStringDeep((obj as Record<string, unknown>)[k]);
                        }
                        return res;
                    }
                    return obj;
                };
                (nextContent as Record<string, unknown>)[fix.section.toLowerCase()] = replaceStringDeep((nextContent as Record<string, unknown>)[fix.section.toLowerCase()]);
            }
        }

        const fixId = Math.random().toString(36).substring(7);
        const now = new Date();

        set({
            updatedContent: nextContent,
            atsScore: Math.min((atsScore || 65) + 5, 99),
            improvements: improvements.map(s => s.id === fix.id ? { ...s, applied: true } : s),
            appliedFixes: [
                {
                    id: fixId,
                    suggestionId: fix.id,
                    section: fix.section,
                    originalText: fix.originalText,
                    newText: newText,
                    appliedAt: now,
                    source: "ai",
                },
                ...appliedFixes,
            ],
            changeLog: [
                {
                    id: fixId + "_log",
                    timestamp: now,
                    section: fix.section,
                    description: `AI applied fixing: ${fix.title}`,
                    fixId: fixId,
                },
                ...changeLog,
            ]
        });
    },

    ignoreFix: (fixId: string) => {
        const { improvements } = get();
        set({
            improvements: improvements.map(s => s.id === fixId ? { ...s, applied: true } : s)
        });
    },

    applyAllFixes: () => {
        const { improvements, applyFix } = get();
        const pending = improvements.filter(s => !s.applied);
        // apply sequentially
        pending.forEach(fix => applyFix(fix));
    },

    undoFix: (fixId: string) => {
        const { appliedFixes, originalContent, changeLog, improvements, atsScore } = get();
        const fix = appliedFixes.find(f => f.id === fixId);
        if (!fix || !originalContent) return;

        // To properly undo, we'd need sequential diff reverse, but for now we fallback 
        // to a deep text replacement backwards on updatedContent, or we rebuild from original applied sequentially
        const currentApplied = appliedFixes.filter(f => f.id !== fixId).reverse();

        // Replay valid fixes on originalContent
        const nextContent = JSON.parse(JSON.stringify(originalContent));
        for (const f of currentApplied) {
            const imp = improvements.find(i => i.id === f.suggestionId);
            if (!imp) continue;

            let current = nextContent;
            const parts = imp.fieldPath.split(".");
            const lastPart = parts.pop();
            if (lastPart) {
                try {
                    for (const p of parts) current = current[p];
                    if (typeof current[lastPart] === "string") {
                        current[lastPart] = current[lastPart].replace(f.originalText, f.newText);
                    } else if (current[lastPart] && current[lastPart].text) {
                        current[lastPart].text = current[lastPart].text.replace(f.originalText, f.newText);
                    }
                } catch {
                    // ignore error in replay
                }
            }
        }

        set({
            updatedContent: nextContent,
            atsScore: Math.max((atsScore || 65) - 5, 20),
            appliedFixes: get().appliedFixes.filter(f => f.id !== fixId),
            changeLog: changeLog.filter(l => l.fixId !== fixId),
            improvements: improvements.map(s => s.id === fix.suggestionId ? { ...s, applied: false } : s)
        });
    },

    undoAll: () => {
        const { originalContent } = get();
        if (!originalContent) return;

        set({
            updatedContent: originalContent,
            appliedFixes: [],
            changeLog: [],
            improvements: get().improvements.map(s => ({ ...s, applied: false })),
            atsScore: get().atsScore ? Math.max(get().atsScore! - get().appliedFixes.length * 5, 40) : null
        });
    },

    updateSection: (section: string, value: unknown) => {
        set(state => {
            if (!state.updatedContent) return state;
            return {
                updatedContent: {
                    ...state.updatedContent,
                    [section]: value
                }
            };
        });
    }
}));
