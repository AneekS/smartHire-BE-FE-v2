"use client";

import useSWR from "swr";
import { jobsApi } from "@/lib/api-client";

export function useJobRecommendations(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    ["/api/jobs/recommendations", limit],
    async ([, requestedLimit]) => jobsApi.recommendations({ limit: requestedLimit as number })
  );

  return {
    recommendations: data,
    isLoading,
    error,
    mutate,
  };
}
