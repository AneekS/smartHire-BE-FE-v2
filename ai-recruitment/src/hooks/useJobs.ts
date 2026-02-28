"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { jobsApi, type Job, type JobSearchParams } from "@/lib/api-client";

export function useJobs(params?: JobSearchParams | null) {
  const hasParams =
    params &&
    (params.role || params.location || params.skills || params.experience);
  const key = hasParams
    ? ["/api/v1/jobs/search", JSON.stringify(params)]
    : "/api/v1/jobs";

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      if (hasParams && params) {
        const res = await jobsApi.search(params);
        return res.jobs ?? [];
      }
      const res = await jobsApi.list();
      return res.jobs ?? [];
    }
  );

  const apply = async (jobId: string, coverNote?: string) => {
    try {
      await jobsApi.apply({ job_id: jobId, cover_note: coverNote });
      toast.success("Application submitted");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
      throw e;
    }
  };

  return {
    jobs: (data ?? []) as Job[],
    isLoading,
    error,
    apply,
    mutate,
  };
}
