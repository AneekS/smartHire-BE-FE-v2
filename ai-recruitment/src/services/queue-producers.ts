import crypto from "crypto";
import { getResumePipelineQueue } from "@/lib/queues";
import type { PipelineInput } from "@/pipeline/resume-pipeline";

export async function enqueueResumePipelineJob(
  input: PipelineInput
): Promise<string> {
  const queue = getResumePipelineQueue();
  const jobId = crypto.randomUUID();

  if (!queue) {
    throw new Error("Redis queue unavailable — set ASYNC_RESUME_PIPELINE=false or configure REDIS_URL");
  }

  await queue.add(
    "parse-index",
    {
      userId: input.userId,
      candidateId: input.candidateId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      bufferBase64: input.buffer.toString("base64"),
    },
    { jobId }
  );

  return jobId;
}

// Legacy no-ops preserved for callers that don't need resume pipeline
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
  candidateId: string;
}): Promise<void> {}
