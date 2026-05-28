/**
 * Queue helpers — resume pipeline uses BullMQ when REDIS_URL is set.
 */

import { getResumePipelineQueue } from "@/lib/queues";

export type QueueJobName =
  | "embed-resume"
  | "embed-job"
  | "healthcheck"
  | "refresh-app-scores"
  | "update-analytics"
  | "send-reminder"
  | "precompute-recommendations"
  | "refresh-recommendation-cache"
  | "compute-behavior-signals"
  | "parse-index";

export async function getQueueProducer() {
  const queue = getResumePipelineQueue();
  if (!queue) {
    return { add: async () => {} };
  }
  return queue;
}

export async function enqueueEmbeddingResumeJob(_payload: { candidateId: string; resumeText: string }): Promise<void> {}

export async function enqueueEmbeddingJob(_payload: { jobId: string; content: string }): Promise<void> {}

export async function enqueueRefreshAppScores(_candidateId: string): Promise<void> {}

export async function enqueueUpdateAnalytics(_candidateId: string): Promise<void> {}

export async function enqueuePrecomputeRecommendations(_candidateId: string, _email?: string): Promise<void> {}

export async function enqueueRefreshRecommendationCache(_candidateId: string): Promise<void> {}

export async function enqueueComputeBehaviorSignals(_candidateId: string): Promise<void> {}

export async function queueHealth(): Promise<{
  mode: "bullmq" | "memory";
  ready: boolean;
  details?: string;
}> {
  const queue = getResumePipelineQueue();
  if (queue) {
    return {
      mode: "bullmq",
      ready: true,
      details: "Resume parse-index queue available",
    };
  }
  return {
    mode: "memory",
    ready: true,
    details: "REDIS_URL not set — inline pipeline only",
  };
}
