import { create } from "zustand";
import { ParsedResume } from "@/lib/services/ParserService";

type UploadStage = "idle" | "uploading" | "extracting" | "parsing" | "scoring" | "suggesting" | "done";

function mapPipelineStatusToStage(status: string): UploadStage {
  switch (status) {
    case "QUEUED":
      return "uploading";
    case "PREPROCESSING":
      return "extracting";
    case "PARSING":
      return "parsing";
    case "PARSED":
    case "SCORED":
      return "scoring";
    case "EMBEDDING":
    case "EMBEDDED":
      return "suggesting";
    case "COMPLETE":
      return "done";
    default:
      return "parsing";
  }
}

/** Statuses where resume is usable in the UI (parse + score done; embed may still run). */
const READY_FOR_UI = new Set(["PARSED", "SCORED", "EMBEDDING", "EMBEDDED", "COMPLETE"]);

async function waitForResumePipeline(
  resumeId: string,
  onStage: (stage: UploadStage) => void
): Promise<void> {
  const maxWaitMs = 600_000;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const res = await fetch(`/api/v1/resumes/${resumeId}/status`, {
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error(`Status check failed (${res.status})`);
    }

    const data = (await res.json()) as {
      status: string;
      pipelineError?: string | null;
    };

    onStage(mapPipelineStatusToStage(data.status));

    if (data.status === "FAILED") {
      throw new Error(data.pipelineError || "Resume processing failed");
    }

    // Don't block the UI on Azure embed indexing — that runs in the background.
    if (READY_FOR_UI.has(data.status)) return;

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(
    "Resume processing timed out. Ensure Ollama is running (ollama serve), workers are up (npm run worker:parse), and check pipelineError in the database."
  );
}

/** v3 breakdown from API or legacy flat keys */
export type ScoreBreakdown =
    | Record<string, { score?: number; weight?: number; contribution?: number; reason?: string }>
    | Record<string, number>;

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
    loadResumeFromAPI: () => Promise<void>;
    uploadResume: (file: File) => Promise<void>;
    replaceResume: (file: File) => Promise<void>;
    deleteResume: () => Promise<void>;
    applyFix: (fix: Improvement, newText?: string) => void;
    ignoreFix: (fixId: string) => void;
    applyAllFixes: () => void;
    undoFix: (fixId: string) => void;
    undoAll: () => void;
    updateSection: (section: string, value: unknown) => void;
}

type StudioPayloadInput = {
    resumeId?: string;
    id?: string;
    fileName?: string;
    title?: string;
    uploadedAt?: string;
    createdAt?: string;
    parsed?: ParsedResume | null;
    atsScore?: number | null;
    scoreBreakdown?: ScoreBreakdown | null;
    improvements?: Improvement[];
};

function hydrateFromStudioPayload(data: StudioPayloadInput) {
    const resumeId = data.resumeId ?? data.id ?? null;
    const parsed = data.parsed ?? null;
    if (!resumeId || !parsed) {
        return {
            resumeId: null,
            fileName: null,
            uploadedAt: null,
            originalContent: null as ParsedResume | null,
            updatedContent: null as ParsedResume | null,
            atsScore: null,
            scoreBreakdown: null,
            improvements: [] as Improvement[],
        };
    }
    return {
        resumeId,
        fileName: data.fileName ?? data.title ?? null,
        uploadedAt: data.uploadedAt ?? data.createdAt ?? null,
        originalContent: parsed,
        updatedContent: parsed,
        atsScore: data.atsScore ?? null,
        scoreBreakdown: data.scoreBreakdown ?? null,
        improvements: data.improvements ?? [],
    };
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
            const res = await fetch("/api/v1/resumes/current", {
                credentials: "include",
            });

            if (res.status === 401) {
                set({ isLoading: false, originalContent: null, updatedContent: null, error: null });
                return;
            }

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                const message =
                    (errBody as { error?: string }).error ?? `Failed to load resume (${res.status})`;
                set({ error: message, isLoading: false });
                return;
            }

            const json = (await res.json()) as { data: StudioPayloadInput | null };

            if (!json.data) {
                set({
                    isLoading: false,
                    originalContent: null,
                    updatedContent: null,
                    resumeId: null,
                    fileName: null,
                    uploadedAt: null,
                    atsScore: null,
                    scoreBreakdown: null,
                    improvements: [],
                });
                return;
            }

            set({ ...hydrateFromStudioPayload(json.data), isLoading: false, error: null });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to load resume";
            set({ error: message, isLoading: false });
        }
    },

    uploadResume: async (file: File) => {
        set({ isUploading: true, error: null, uploadStage: "uploading" });
        try {
            const formData = new FormData();
            formData.append("resume", file);

            set({ uploadStage: "parsing" });

            const res = await fetch("/api/v1/resumes/upload", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (!res.ok) {
                let errorMessage = "Upload failed";
                try {
                    const errData = await res.json();
                    errorMessage =
                        (errData.error as string) ||
                        (errData.message as string) ||
                        `HTTP ${res.status}`;
                } catch {
                    errorMessage = `HTTP ${res.status}: ${res.statusText}`;
                }
                set({ error: errorMessage, isUploading: false, uploadStage: "idle" });
                return;
            }

            // Async pipeline — poll status until workers finish
            if (res.status === 202) {
                const queuedJson = (await res.json()) as {
                    resumeId?: string;
                    data?: { resumeId?: string };
                };
                const resumeId =
                    queuedJson.data?.resumeId ?? queuedJson.resumeId;
                if (!resumeId) {
                    set({
                        error: "Invalid response from server (missing resumeId)",
                        isUploading: false,
                        uploadStage: "idle",
                    });
                    return;
                }
                await waitForResumePipeline(resumeId, (stage) =>
                    set({ uploadStage: stage })
                );
                await get().loadResumeFromAPI();
                set({ isUploading: false, uploadStage: "idle", error: null });
                return;
            }

            // Sync pipeline (ASYNC_RESUME_PIPELINE=false) — 201 with full parse payload
            const json = await res.json();
            const data = json.resume ?? json.data ?? json;
            const resumeId = data?.resumeId ?? data?.id ?? json.resumeId;

            if (!resumeId) {
                set({ error: "Invalid response from server", isUploading: false, uploadStage: "idle" });
                return;
            }

            const studioData: StudioPayloadInput = {
                resumeId,
                fileName: data.fileName ?? data.file_name ?? file.name,
                uploadedAt: data.uploadedAt ?? data.created_at ?? new Date().toISOString(),
                parsed: data.parsed ?? data.parsedContent ?? null,
                atsScore: data.atsScore ?? null,
                scoreBreakdown: data.scoreBreakdown ?? null,
                improvements: data.improvements ?? [],
            };

            if (studioData.parsed) {
                set({
                    uploadStage: "done",
                    ...hydrateFromStudioPayload(studioData),
                    appliedFixes: [],
                    changeLog: [],
                    isUploading: false,
                    error: null,
                });
            } else {
                await get().loadResumeFromAPI();
                set({ isUploading: false, uploadStage: "idle", error: null });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Network error";
            set({ error: message, isUploading: false, uploadStage: "idle" });
        }
    },

    replaceResume: async (file: File) => {
        set({ isUploading: true, error: null, uploadStage: "uploading" });
        try {
            const delRes = await fetch("/api/resume", { method: "DELETE", credentials: "include" });
            if (!delRes.ok && delRes.status !== 404) {
                const errData = await delRes.json().catch(() => ({}));
                set({
                    error: (errData.error as string) || "Failed to remove current resume",
                    isUploading: false,
                });
                return;
            }
            get().uploadResume(file);
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Replace failed",
                isUploading: false,
            });
        }
    },

    deleteResume: async () => {
        try {
            const res = await fetch("/api/resume", { method: "DELETE", credentials: "include" });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error((errData.error as string) || "Delete failed");
            }
            set({
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
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : "Delete failed" });
        }
    },

    applyFix: (fix: Improvement, customNewText?: string) => {
        const { updatedContent, appliedFixes, changeLog, improvements } = get();
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
        const { appliedFixes, originalContent, changeLog, improvements } = get();
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
