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

  return {
    profile: data ?? null,
    isLoading,
    error,
    updateProfile,
    mutate,
  };
}
