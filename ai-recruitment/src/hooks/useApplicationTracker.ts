import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { toast } from "sonner";
import {
  applicationsApi,
  type TrackerApplication,
  type TrackerApplicationDetail,
  type TrackerApplicationStatus,
  type TrackerAnalytics,
  type TrackerReminder,
} from "@/lib/api-client";

// ─── Application List (infinite scroll) ──────────────────────────────────

export function useApplications(params?: { status?: TrackerApplicationStatus }) {
  const getKey = (
    pageIndex: number,
    previousPageData: { applications: TrackerApplication[]; nextCursor: string | null } | null
  ) => {
    if (previousPageData && !previousPageData.nextCursor) return null;
    const cursor = previousPageData?.nextCursor ?? undefined;
    return ["applications", params?.status ?? "all", pageIndex, cursor] as const;
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite(
      getKey,
      async ([, status, , cursor]) => {
        return applicationsApi.list({
          status: status === "all" ? undefined : (status as TrackerApplicationStatus),
          cursor: cursor as string | undefined,
          limit: 20,
        });
      },
      {
        revalidateFirstPage: true,
        revalidateOnFocus: false,
      }
    );

  const applications = data?.flatMap((page) => page.applications) ?? [];
  const hasMore = data?.[data.length - 1]?.nextCursor !== null;
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      setSize(size + 1);
    }
  };

  const withdraw = async (id: string) => {
    try {
      await applicationsApi.withdraw(id);
      toast.success("Application withdrawn");
      await mutate();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to withdraw";
      toast.error(message);
      throw e;
    }
  };

  return {
    applications,
    isLoading,
    isLoadingMore,
    isValidating,
    hasMore,
    loadMore,
    withdraw,
    mutate,
    error,
  };
}

// ─── Application Detail ──────────────────────────────────────────────────

export function useApplicationDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["application-detail", id] : null,
    async () => {
      if (!id) return null;
      return applicationsApi.getDetail(id);
    },
    { revalidateOnFocus: false }
  );

  const addNote = async (content: string) => {
    if (!id) return;
    try {
      await applicationsApi.addNote(id, content);
      toast.success("Note added");
      await mutate();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add note";
      toast.error(message);
      throw e;
    }
  };

  const withdraw = async () => {
    if (!id) return;
    try {
      await applicationsApi.withdraw(id);
      toast.success("Application withdrawn");
      await mutate();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to withdraw";
      toast.error(message);
      throw e;
    }
  };

  return {
    application: data ?? null,
    isLoading,
    error,
    addNote,
    withdraw,
    mutate,
  };
}

// ─── Analytics ───────────────────────────────────────────────────────────

export function useApplicationAnalytics() {
  const { data, error, isLoading, mutate } = useSWR(
    "application-analytics",
    () => applicationsApi.analytics(),
    { revalidateOnFocus: false, refreshInterval: 60_000 }
  );

  return {
    analytics: data ?? null,
    isLoading,
    error,
    mutate,
  };
}

// ─── Reminders ───────────────────────────────────────────────────────────

export function useApplicationReminders() {
  const { data, error, isLoading } = useSWR(
    "application-reminders",
    () => applicationsApi.reminders(),
    { revalidateOnFocus: false, refreshInterval: 300_000 }
  );

  return {
    reminders: data?.reminders ?? [],
    isLoading,
    error,
  };
}
