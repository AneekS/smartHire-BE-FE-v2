/**
 * Cache Worker  (src/workers/cacheWorker.ts)
 *
 * Consumes jobs from the `cache-refresh` queue.
 * For each job it evicts (DEL) the specified Redis key, allowing the
 * next API request to repopulate it from the database.
 *
 * This decouples cache invalidation from the hot request path — API routes
 * call `enqueueCacheRefresh(key)` (< 1 ms) instead of blocking on Redis DEL.
 *
 * Extensible: add new job-name branches below to handle targeted re-warming
 * (e.g. pre-fetching popular job listings after eviction).
 *
 * Run independently of the API server:
 *   npx tsx src/workers/cacheWorker.ts
 *   (or via `npm run worker:cache`)
 *
 * Concurrency controlled by CACHE_WORKER_CONCURRENCY (default 10).
 */

import { Worker } from 'bullmq';
import { getBullConnectionOptions } from '@/lib/redis-options';
import { QUEUE_NAMES } from '@/lib/queues';
import { CacheService } from '@/lib/cache-utils';

// ─── Bootstrap guard ─────────────────────────────────────────────────────────

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is required to run the cache worker');
}

// ─── Job payloads ─────────────────────────────────────────────────────────────

type RefreshCachePayload = { key: string };

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleRefreshCache(key: string): Promise<void> {
  await CacheService.del(key);
  console.log(`[WORKER][CACHE] Evicted key: ${key}`);
}

// ─── Worker bootstrap ─────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) {
    throw new Error('Failed to parse REDIS_URL for cache worker');
  }

  const worker = new Worker<RefreshCachePayload>(
    QUEUE_NAMES.CACHE_REFRESH,
    async (job) => {
      if (job.name === 'refresh-cache') {
        await handleRefreshCache(job.data.key);
      }
    },
    {
      connection,
      concurrency: Number(process.env.CACHE_WORKER_CONCURRENCY ?? 10),
    },
  );

  worker.on('failed', (job, error) => {
    console.error('[WORKER][CACHE][FAILED]', job?.id, error.message);
  });

  worker.on('completed', (job) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[WORKER][CACHE][DONE]', job.id);
    }
  });

  console.log('[WORKER][CACHE] Started');
}

void bootstrap();
