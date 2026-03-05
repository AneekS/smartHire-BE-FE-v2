/**
 * useProfileSections
 * Hooks for Experience, Projects, Certifications, Career Preferences, Privacy, AI Insights.
 * All mutations call the relevant /api/profile/* endpoints.
 */

"use client";

import useSWR from "swr";
import { toast } from "sonner";
import type {
  ExperienceRecord,
  ProjectRecord,
  CertificationRecord,
  CareerPreference,
  ProfilePrivacy,
  AIInsights,
} from "@/lib/api-client";

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── useExperiences ───────────────────────────────────────────────────────────

export function useExperiences() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<ExperienceRecord[]>(
    "/api/profile/experience",
    fetcher
  );

  const add = async (exp: Omit<ExperienceRecord, "id">) => {
    try {
      await mutate("/api/profile/experience", "POST", exp);
      toast.success("Experience added");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add experience");
      throw e;
    }
  };

  const update = async (id: string, exp: Partial<ExperienceRecord>) => {
    try {
      await mutate("/api/profile/experience", "PATCH", { id, ...exp });
      toast.success("Experience updated");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update experience");
      throw e;
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/profile/experience?id=${id}`, { method: "DELETE", credentials: "include" });
      toast.success("Experience removed");
      await revalidate();
    } catch (e) {
      toast.error("Failed to remove experience");
      throw e;
    }
  };

  return { experiences: data ?? [], isLoading, error, add, update, remove };
}

// ─── useProjects ──────────────────────────────────────────────────────────────

export function useProjects() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<ProjectRecord[]>(
    "/api/profile/projects",
    fetcher
  );

  const add = async (project: Omit<ProjectRecord, "id">) => {
    try {
      await mutate("/api/profile/projects", "POST", project);
      toast.success("Project added");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add project");
      throw e;
    }
  };

  const update = async (id: string, project: Partial<ProjectRecord>) => {
    try {
      await mutate("/api/profile/projects", "PATCH", { id, ...project });
      toast.success("Project updated");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update project");
      throw e;
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/profile/projects?id=${id}`, { method: "DELETE", credentials: "include" });
      toast.success("Project removed");
      await revalidate();
    } catch (e) {
      toast.error("Failed to remove project");
      throw e;
    }
  };

  return { projects: data ?? [], isLoading, error, add, update, remove };
}

// ─── useCertifications ────────────────────────────────────────────────────────

export function useCertifications() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<CertificationRecord[]>(
    "/api/profile/certifications",
    fetcher
  );

  const add = async (cert: Omit<CertificationRecord, "id">) => {
    try {
      await mutate("/api/profile/certifications", "POST", cert);
      toast.success("Certification added");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add certification");
      throw e;
    }
  };

  const update = async (id: string, cert: Partial<CertificationRecord>) => {
    try {
      await mutate("/api/profile/certifications", "PATCH", { id, ...cert });
      toast.success("Certification updated");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update certification");
      throw e;
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/profile/certifications?id=${id}`, { method: "DELETE", credentials: "include" });
      toast.success("Certification removed");
      await revalidate();
    } catch (e) {
      toast.error("Failed to remove certification");
      throw e;
    }
  };

  return { certifications: data ?? [], isLoading, error, add, update, remove };
}

// ─── useCareerPreferences ─────────────────────────────────────────────────────

export function useCareerPreferences() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<CareerPreference | null>(
    "/api/profile/career-preferences",
    fetcher
  );

  const save = async (prefs: CareerPreference) => {
    try {
      await mutate("/api/profile/career-preferences", "PUT", prefs);
      toast.success("Career preferences saved");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save preferences");
      throw e;
    }
  };

  return { careerPreference: data ?? null, isLoading, error, save };
}

// ─── usePrivacy ───────────────────────────────────────────────────────────────

export function usePrivacy() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<ProfilePrivacy>(
    "/api/profile/privacy",
    fetcher
  );

  const update = async (privacy: Partial<ProfilePrivacy>) => {
    try {
      await mutate("/api/profile/privacy", "PATCH", privacy);
      toast.success("Privacy settings updated");
      await revalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update privacy");
      throw e;
    }
  };

  return {
    privacy: data ?? { isPublic: true, visibleToRecruiters: true, anonymousMode: false, hideContactInfo: false },
    isLoading,
    error,
    update,
  };
}

// ─── useAIInsights ────────────────────────────────────────────────────────────

export function useAIInsights() {
  const { data, error, isLoading } = useSWR<AIInsights>(
    "/api/profile/ai-insights",
    fetcher
  );

  return {
    insights: data ?? null,
    isLoading,
    error,
    hasInsights: !!(data?.careerLevel),
  };
}
