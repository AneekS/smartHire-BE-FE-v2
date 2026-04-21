"use client";

import useSWR from "swr";

export interface PreferredRoleItem {
  id: string;
  role: string;
  priority: number;
  confidenceScore: number;
  source?: string;
  updatedAt?: string;
}

export interface SalaryProfileItem {
  id?: string;
  minSalary: number;
  maxSalary: number;
  currency?: string;
  salaryType?: "MONTHLY" | "YEARLY";
  isNegotiable?: boolean;
  preferredLocations?: string[];
  confidenceScore?: number;
}

interface ProfilePreferencesData {
  preferredRoles: PreferredRoleItem[];
  salaryProfile: SalaryProfileItem | null;
}

async function fetchPreferences(): Promise<ProfilePreferencesData> {
  const res = await fetch("/api/profile/preferences");
  if (!res.ok) throw new Error("Failed to load preferences");
  return res.json();
}

export function useProfilePreferences() {
  const { data, error, isLoading, mutate } = useSWR<ProfilePreferencesData>(
    "/api/profile/preferences",
    fetchPreferences,
    { revalidateOnFocus: false },
  );

  return {
    preferredRoles: data?.preferredRoles ?? [],
    salaryProfile: data?.salaryProfile ?? null,
    isLoading,
    error,
    mutate,
  };
}
