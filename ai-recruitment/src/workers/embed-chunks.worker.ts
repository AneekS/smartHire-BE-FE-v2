import { Worker } from "bullmq";
import { getBullConnectionOptions } from "@/lib/redis-options";
import {
  EMBED_QUEUE_NAMES,
  RedisJobQueue,
  assertRedisHealthy,
  type EmbedJobPayload,
} from "@/queue/redis-queue";
import { embedChunksJob } from "@/pipeline/embed-stage";
import { OllamaPool } from "@/embedding/ollama-pool";

const EMBED_BACKOFF_MS = [10_000, 30_000, 60_000] as const;

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required to run the embed worker");
}

const connection = getBullConnectionOptions(redisUrl);
if (!connection) {
  throw new Error("Failed to parse REDIS_URL for embed worker");
}

const concurrency = Number(process.env.EMBED_WORKER_CONCURRENCY ?? 1);
const lockDuration = 120_000;

const queueNames = [
  EMBED_QUEUE_NAMES.HIGH,
  EMBED_QUEUE_NAMES.NORMAL,
  EMBED_QUEUE_NAMES.RETRY,
];

async function bootstrap() {
  await assertRedisHealthy();
  await OllamaPool.initialize();

  for (const queueName of queueNames) {
    const worker = new Worker(
      queueName,
      async (job) => {
        if (job.name !== "embed-chunks") return;
        return embedChunksJob(job.data as EmbedJobPayload);
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
  }
}

bootstrap().catch((e) => {
  console.error("[WORKER][EMBED] bootstrap failed:", e);
  process.exit(1);
});
