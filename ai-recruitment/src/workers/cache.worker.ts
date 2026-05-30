import { Worker, type Job } from "bullmq";
import { getWorkerConnection } from "@/lib/bullmq";
import { QUEUE_NAMES } from "@/lib/queues";
import { CacheService } from "@/lib/cache-utils";

type RefreshCachePayload = { key: string };

export async function warmCacheKey(key: string): Promise<void> {
  await CacheService.del(key);
  console.log(`[WORKER][CACHE] Evicted key: ${key}`);
}

export async function startCacheWorker(): Promise<Worker> {
  const worker = new Worker<RefreshCachePayload>(
    QUEUE_NAMES.CACHE_REFRESH,
    async (job: Job<RefreshCachePayload>) => {
      if (job.name === "refresh-cache") {
        await warmCacheKey(job.data.key);
      }
    },
    {
      connection: getWorkerConnection(),
      concurrency: Number(process.env.CACHE_WORKER_CONCURRENCY ?? 10),
    }
  );

  worker.on("failed", (job, error) => {
    console.error("[WORKER][CACHE][FAILED]", job?.id, error.message);
  });

  worker.on("completed", (job) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[WORKER][CACHE][DONE]", job.id);
    }
  });

  console.log("[WORKER][CACHE] Started");
  return worker;
}

startCacheWorker().catch((e) => {
  console.error("[WORKER][CACHE] bootstrap failed:", e);
  process.exit(1);
});
