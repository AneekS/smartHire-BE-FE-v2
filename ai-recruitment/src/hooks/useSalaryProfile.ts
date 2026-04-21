"use client";

import useSWR, { mutate as swrMutate } from "swr";
import { toast } from "sonner";
import { salaryApi } from "@/lib/api-client";

async function revalidatePreferenceCaches() {
  await swrMutate("/api/profile/preferences");
}

export function useSalaryProfile() {
  const { data, error, isLoading, mutate } = useSWR("/api/v1/salary", () => salaryApi.get());

  const saveProfile = async (payload: {
    minSalary: number;
    maxSalary: number;
    currency?: string;
    salaryType?: "MONTHLY" | "YEARLY";
    isNegotiable?: boolean;
    preferredLocations?: string[];
    confidenceScore?: number;
  }) => {
    try {
      await salaryApi.upsert(payload);
      await mutate();
      await revalidatePreferenceCaches();
      toast.success("Salary profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update salary profile");
      throw err;
    }
  };

  const deleteProfile = async () => {
    try {
      await salaryApi.remove();
      await mutate();
      await revalidatePreferenceCaches();
      toast.success("Salary profile cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete salary profile");
      throw err;
    }
  };

  return {
    profile: data?.profile ?? null,
    isLoading,
    error,
    saveProfile,
    deleteProfile,
    mutate,
  };
}
