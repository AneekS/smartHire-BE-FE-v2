"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { candidatesApi, type CandidateProfile } from "@/lib/api-client";
import { adaptCandidate } from "@/lib/adapters";

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/candidates/profile",
    async () => {
      const raw = await candidatesApi.getProfile();
      return adaptCandidate(raw);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
      errorRetryCount: 1,
      shouldRetryOnError: false,
    }
  );

  const updateProfile = async (updates: Partial<CandidateProfile>) => {
    try {
      await candidatesApi.updateProfile(updates);
      toast.success("Profile updated");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
      throw e;
    }
  };

  const loadError =
    error instanceof Error
      ? error.message
      : error
        ? "Failed to load profile"
        : null;

  return {
    profile: data ?? null,
    isLoading,
    error,
    loadError,
    updateProfile,
    mutate,
  };
}
