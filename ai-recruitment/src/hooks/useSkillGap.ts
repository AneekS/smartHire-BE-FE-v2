"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { skillsApi, type SkillGapResult } from "@/lib/api-client";

export function useSkillGap() {
  const [gaps, setGaps] = useState<SkillGapResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async (targetRole: string) => {
    setLoading(true);
    setGaps(null);
    try {
      const result = await skillsApi.gapAnalysis({ target_role: targetRole });
      setGaps(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { gaps, loading, analyze };
}
