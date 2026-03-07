"use client";

import useSWR from "swr";
import { toast } from "sonner";
import {
  resumesApi,
  type ResumeVersion,
  type ResumeUploadResponse,
} from "@/lib/api-client";
import { adaptResumeVersion, adaptResumeAnalysis } from "@/lib/adapters";

export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/resumes",
    async () => {
      const raw = await resumesApi.list();
      return (raw as unknown as Record<string, unknown>[]).map(adaptResumeVersion);
    }
  );

  const uploadResume = async (file: File): Promise<ResumeUploadResponse> => {
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const result = (await resumesApi.upload(formData)) as ResumeUploadResponse;
      toast.success("Resume uploaded successfully");
      await mutate();
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      throw e;
    }
  };

  const analyzeResume = async (resumeId: string): Promise<void> => {
    try {
      const res = await fetch("/api/v1/resumes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }
      toast.success("AI Analysis complete!");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
      throw e;
    }
  };

  return {
    resumes: data ?? [],
    isLoading,
    error,
    uploadResume,
    analyzeResume,
    mutate,
  };
}

export function useResumeScore(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    jobId ? `/api/v1/resumes/score/${jobId}` : null,
    async () => {
      if (!jobId) return null;
      const raw = await resumesApi.getScoreForJob(jobId);
      return {
        score: raw.score,
        matched: raw.matched ?? [],
        missing: raw.missing ?? [],
        suggestions: raw.suggestions ?? [],
      };
    }
  );

  return {
    score: data?.score ?? null,
    matched: data?.matched ?? [],
    missing: data?.missing ?? [],
    suggestions: data?.suggestions ?? [],
    isLoading,
    error,
    mutate,
  };
}
