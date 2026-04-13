"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export type ExperienceLevel = "ENTRY" | "MID" | "SENIOR" | "LEAD";
export type WorkType = "REMOTE" | "HYBRID" | "ONSITE" | "CONTRACT" | "FREELANCE";
export type SalaryVisibility = "PUBLIC" | "RANGE_ONLY" | "PRIVATE";

export interface PreferenceFormState {
  primaryRole: string;
  secondaryRoles: string[];
  exploratoryRoles: string[];
  experienceLevel: ExperienceLevel;
  preferredIndustries: string[];
  preferredWorkTypes: WorkType[];
  preferredLocations: string[];
  salaryMin: number;
  salaryTarget: number;
  salaryMax: number;
  salaryVisibility: SalaryVisibility;
}

export interface RoleFitScoreDto {
  id: string;
  role: string;
  score: number;
  strengths: string[];
  skillGaps: string[];
}

export interface CareerTrajectoryDto {
  currentRole: string;
  nextRole: string;
  estimatedSalary: number;
  timeline: string;
  skillsToAcquire: string[];
}

interface PreferenceResponse {
  success?: boolean;
  data?: PreferenceFormState | null;
  preference?: PreferenceFormState | null;
  authenticated?: boolean;
  error?: string;
}

interface RoleFitResponse {
  scores?: RoleFitScoreDto[];
  trajectory?: CareerTrajectoryDto | null;
  error?: string;
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;

  if (res.status === 401) {
    if (url === "/api/preferences") {
      return { success: true, data: {}, preference: null } as T;
    }
    if (url === "/api/role-fit") {
      return { scores: [], trajectory: null } as T;
    }
  }

  if (!res.ok) {
    throw new Error(body?.error ?? `Failed to fetch ${url} (${res.status})`);
  }

  return body as T;
};

const DEFAULT_PREF: PreferenceFormState = {
  primaryRole: "",
  secondaryRoles: [],
  exploratoryRoles: [],
  experienceLevel: "MID",
  preferredIndustries: [],
  preferredWorkTypes: ["REMOTE"],
  preferredLocations: [],
  salaryMin: 600000,
  salaryTarget: 1200000,
  salaryMax: 1800000,
  salaryVisibility: "RANGE_ONLY",
};

export function usePreferences() {
  const router = useRouter();
  const pref = useSWR<PreferenceResponse>("/api/preferences", fetcher, {
    dedupingInterval: 15_000, // Prevent rapid refetches (preferences + role-fit)
    revalidateOnFocus: false, // Avoid refetch on tab focus
  });
  const roleFit = useSWR<RoleFitResponse>("/api/role-fit", fetcher, {
    dedupingInterval: 15_000,
    revalidateOnFocus: false,
  });

  const serverPreference = pref.data?.preference ?? pref.data?.data ?? null;
  const authenticated = pref.data?.authenticated ?? true;
  const preference = serverPreference ?? DEFAULT_PREF;
  const hasSavedPreference = serverPreference != null;
  const error = pref.error;
  const roleFitError = roleFit.error;

  const save = useCallback(async (payload: PreferenceFormState) => {
    const sanitizedPayload = {
      primaryRole: payload.primaryRole?.trim() || "",
      secondaryRoles: payload.secondaryRoles ?? [],
      exploratoryRoles: payload.exploratoryRoles ?? [],
      experienceLevel: payload.experienceLevel ?? "MID",
      preferredIndustries: payload.preferredIndustries ?? [],
      preferredWorkTypes: payload.preferredWorkTypes ?? [],
      preferredLocations: payload.preferredLocations ?? [],
      salaryMin: payload.salaryMin ?? 0,
      salaryTarget: payload.salaryTarget ?? 0,
      salaryMax: payload.salaryMax ?? 0,
      salaryVisibility: payload.salaryVisibility ?? "RANGE_ONLY",
    };

    console.log("Saving preferences:", sanitizedPayload);

    const method = pref.data?.preference ? "PATCH" : "POST";
    const res = await fetch("/api/preferences", {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(sanitizedPayload),
    });

    if (res.status === 401) {
      console.warn("Preferences save skipped: unauthorized");
      return;
    }

    if (res.status === 409) {
      console.warn("User not initialized. Redirecting...");
      router.push("/login");
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Save failed" }));
      console.error("Save failed:", body);
      return;
    }

    await Promise.all([pref.mutate(), roleFit.mutate()]);
  }, [pref.mutate, roleFit.mutate, router, pref.data?.preference]);

  const refreshRoleFit = useCallback(async () => {
    await fetch("/api/role-fit?refresh=true", { credentials: "include" });
    await roleFit.mutate();
  }, [roleFit.mutate]);

  const refresh = useCallback(async () => {
    await Promise.all([pref.mutate(), roleFit.mutate()]);
  }, [pref.mutate, roleFit.mutate]);

  return {
    authenticated,
    preference,
    hasSavedPreference,
    roleFitScores: roleFit.data?.scores ?? [],
    trajectory: roleFit.data?.trajectory ?? null,
    isLoading: pref.isLoading,
    error,
    roleFitError,
    save,
    refresh,
    refreshRoleFit,
  };
}
