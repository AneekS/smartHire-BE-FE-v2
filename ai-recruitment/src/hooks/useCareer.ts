"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { careerApi } from "@/lib/api-client";
import { adaptCareerPath } from "@/lib/adapters";

export type CareerMilestone = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string | null;
  skills: string[];
};

export function useCareer(targetRole: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    targetRole ? ["/api/v1/career/path", targetRole] : null,
    async () => {
      if (!targetRole) return [];
      const raw = await careerApi.getPath({ target_role: targetRole });
      return adaptCareerPath(raw as Record<string, unknown>);
    }
  );

  return {
    milestones: (data ?? []) as CareerMilestone[],
    isLoading,
    error,
    refresh: mutate,
  };
}
