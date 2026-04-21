/**
 * Queue — DISABLED
 *
 * Redis / BullMQ background jobs are not active in this deployment.
 * All exported functions are safe no-ops that satisfy every existing call-site.
 */

export type QueueJobName =
  | "embed-resume"
  | "embed-job"
  | "healthcheck"
  | "refresh-app-scores"
  | "update-analytics"
  | "send-reminder"
  | "precompute-recommendations"
  | "refresh-recommendation-cache"
  | "compute-behavior-signals";

export async function getQueueProducer() {
  return {
    add: async () => {},
  };
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
  return {
    mode: "memory",
    ready: true,
    details: "Queue disabled — no Redis dependency",
  };
}
