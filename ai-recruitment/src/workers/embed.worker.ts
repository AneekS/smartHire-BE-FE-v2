import { Worker, type Job } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { getWorkerConnection } from "@/lib/bullmq";
import {
  EMBED_QUEUE_NAMES,
  RedisJobQueue,
  assertRedisHealthy,
  type EmbedJobPayload,
} from "@/queue/redis-queue";
import { runEmbedStage } from "@/pipeline/EmbedStage";
import { OllamaPool } from "@/embedding/ollama-pool";
import { getPipelineEnv } from "@/config/pipeline-env";
import { EMBED_DIMENSIONS } from "@/parsing/constants";

const EMBED_BACKOFF_MS = [10_000, 30_000, 60_000] as const;

export async function processEmbedJob(payload: EmbedJobPayload): Promise<{ indexed: number }> {
  const result = await runEmbedStage(payload);
  const env = getPipelineEnv();
  if (env.USE_OLLAMA_EMBEDDINGS && result.indexed > 0) {
    const expected = env.EMBED_VECTOR_DIMENSIONS ?? EMBED_DIMENSIONS;
    if (expected !== EMBED_DIMENSIONS) {
      console.warn(`[WORKER][EMBED] expected ${EMBED_DIMENSIONS} dims, env=${expected}`);
    }
  }
  return result;
}

export async function startEmbedWorkers(): Promise<Worker[]> {
  const connection = getWorkerConnection();
  const concurrency = Number(process.env.EMBED_WORKER_CONCURRENCY ?? 1);
  const lockDuration = 120_000;
  const queueNames = [
    EMBED_QUEUE_NAMES.HIGH,
    EMBED_QUEUE_NAMES.NORMAL,
    EMBED_QUEUE_NAMES.RETRY,
  ];

  await assertRedisHealthy();
  await OllamaPool.initialize();

  const workers: Worker[] = [];

  for (const queueName of queueNames) {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        if (job.name !== "embed-chunks") return;
        return processEmbedJob(job.data as EmbedJobPayload);
      },
      {
        connection: { ...connection },
        concurrency,
        lockDuration,
        settings: {
          backoffStrategy: (attemptsMade: number) =>
            EMBED_BACKOFF_MS[Math.min(attemptsMade - 1, EMBED_BACKOFF_MS.length - 1)],
        },
      }
    );

    worker.on("completed", (job) => {
      console.log(`[WORKER][EMBED][${queueName}][DONE]`, job.id);
    });

    worker.on("failed", async (job, err) => {
      console.error(`[WORKER][EMBED][${queueName}][FAILED]`, job?.id, err);
      Sentry.captureException(err, {
        tags: { worker: "embed", queue: queueName },
        extra: { jobId: job?.id },
      });

      if (!job) return;
      const attempts = job.opts.attempts ?? 1;
      if (job.attemptsMade >= attempts && queueName !== EMBED_QUEUE_NAMES.RETRY) {
        try {
          await RedisJobQueue.enqueueToRetry(job.data as EmbedJobPayload);
          console.log(`[WORKER][EMBED] moved job ${job.id} to retry queue`);
        } catch (e) {
          console.error("[WORKER][EMBED] failed to enqueue retry:", e);
        }
      }
    });

    console.log(`[WORKER][EMBED] listening on ${queueName} (concurrency=${concurrency})`);
    workers.push(worker);
  }

  return workers;
}
