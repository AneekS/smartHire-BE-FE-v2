/**
 * Queue Producers — DISABLED
 *
 * Redis / BullMQ background jobs are not active in this deployment.
 * Every exported function is a safe no-op so all call-sites compile
 * without change and produce no runtime errors.
 */

export async function enqueueRecommendationUpdate(_candidateId: string): Promise<void> {}

export async function enqueueAnalyticsUpdate(_candidateId: string): Promise<void> {}

export async function enqueueCacheRefresh(_key: string): Promise<void> {}

export async function enqueueEmbeddingResumeJob(_data: {
  candidateId: string;
  resumeText: string;
}): Promise<void> {}

export async function enqueueEmbeddingJob(_data: {
  jobId: string;
  content: string;
}): Promise<void> {}

export async function enqueueSalaryInference(_data: {
  userId: string;
  role: string;
  location: string;
}): Promise<void> {}
