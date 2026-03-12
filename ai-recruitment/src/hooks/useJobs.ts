"use client";

import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { toast } from "sonner";
import { jobsApi, type Job, type JobSearchParams } from "@/lib/api-client";

type Page = { jobs: Job[]; nextCursor: string | null };

export function useJobs(params?: JobSearchParams | null) {
  const getKey = (pageIndex: number, previousPageData: Page | null) => {
    if (previousPageData && !previousPageData.nextCursor) return null;
    const cursor = pageIndex === 0 ? undefined : previousPageData?.nextCursor ?? undefined;
    return ["/api/jobs/search", JSON.stringify({ ...(params ?? {}), cursor })] as const;
  };

  const {
    data,
    error,
    isLoading,
    mutate,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<Page>(
    getKey,
    async ([, keyParams]) => jobsApi.search(JSON.parse(String(keyParams)) as JobSearchParams),
    { revalidateFirstPage: false }
  );

  const { data: savedData, mutate: mutateSaved } = useSWR("/api/jobs/saved", () => jobsApi.saved());

  const pages = data ?? [];
  const jobs = pages.flatMap((page) => page.jobs);
  const nextCursor = pages[pages.length - 1]?.nextCursor ?? null;
  const hasMore = Boolean(nextCursor);
  const isLoadingMore = isValidating && size > 0;

  const savedIds = new Set((savedData?.jobs ?? []).map((job) => job.id));

  const apply = async (jobId: string, coverNote?: string) => {
    try {
      await jobsApi.apply({ job_id: jobId, cover_note: coverNote });
      await jobsApi.trackBehaviorEvent({ jobId, eventType: "JOB_APPLICATION" });
      toast.success("Application submitted");
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
      throw e;
    }
  };

  const toggleSave = async (jobId: string, save: boolean) => {
    try {
      if (save) {
        await jobsApi.save(jobId);
        await jobsApi.trackBehaviorEvent({ jobId, eventType: "JOB_SAVE" });
        toast.success("Job saved");
      } else {
        await jobsApi.unsave(jobId);
        await jobsApi.trackBehaviorEvent({ jobId, eventType: "JOB_IGNORE" });
        toast.success("Job removed from saved list");
      }

      await Promise.all([mutate(), mutateSaved()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update saved jobs");
      throw e;
    }
  };

  const loadMore = async () => {
    if (!hasMore) return;
    await setSize((s) => s + 1);
  };

  return {
    jobs,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    savedIds,
    loadMore,
    apply,
    toggleSave,
    mutate,
  };
}
