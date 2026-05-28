import { Worker } from "bullmq";
import { getBullConnectionOptions } from "@/lib/redis-options";
import { QUEUE_NAMES } from "@/lib/queues";
import { runResumePipeline } from "@/pipeline/resume-pipeline";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required to run the resume index worker");
}

const connection = getBullConnectionOptions(redisUrl);
if (!connection) {
  throw new Error("Failed to parse REDIS_URL for resume index worker");
}

const worker = new Worker(
  QUEUE_NAMES.RESUME_PIPELINE,
  async (job) => {
    const { userId, candidateId, fileName, mimeType, bufferBase64 } = job.data as {
      userId: string;
      candidateId: string;
      fileName: string;
      mimeType: string;
      bufferBase64: string;
    };

    return runResumePipeline({
      userId,
      candidateId,
      fileName,
      buffer: Buffer.from(bufferBase64, "base64"),
      mimeType,
    });
  },
  {
    connection,
    concurrency: Number(process.env.RESUME_WORKER_CONCURRENCY ?? 3),
  }
);

worker.on("completed", (job) => {
  console.log("[WORKER][RESUME-INDEX][DONE]", job.id);
});

worker.on("failed", (job, err) => {
  console.error("[WORKER][RESUME-INDEX][FAILED]", job?.id, err);
});

console.log("[WORKER][RESUME-INDEX] listening on", QUEUE_NAMES.RESUME_PIPELINE);
