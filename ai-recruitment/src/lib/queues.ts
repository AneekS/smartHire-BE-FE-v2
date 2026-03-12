/**
 * BullMQ Queue Registry
 *
 * Three separate named queues for horizontal scaling:
 *  - recommendation-scores  → precomputes per-candidate job scores
 *  - candidate-analytics    → aggregates application analytics
 *  - cache-refresh          → invalidates or refreshes Redis keys
 *
 * All queues:
 *  - share the same Redis connection options (from REDIS_URL)
 *  - use exponential-backoff retry (3 attempts)
 *  - cap completed / failed history to avoid memory bloat
 *  - degrade gracefully when REDIS_URL is not configured
 */

import { Queue } from 'bullmq';
import { getBullConnectionOptions } from '@/lib/redis-options';

// ─── Queue name constants ────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  RECOMMENDATIONS: 'recommendation-scores',
  ANALYTICS:       'candidate-analytics',
  CACHE_REFRESH:   'cache-refresh',
  // Shared queue for resume & job embedding generation
  EMBEDDINGS:      'recommendation-embedding-jobs',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Shared job options ──────────────────────────────────────────────────────

const defaultJobOptions = {
  removeOnComplete: { count: 1_000 },
  removeOnFail:     { count: 2_000 },
  attempts: 3,
  backoff: {
    type:  'exponential' as const,
    delay: 2_000,
  },
};

// ─── Internal factory ────────────────────────────────────────────────────────

function createQueue(name: string): Queue | null {
  const connection = getBullConnectionOptions(process.env.REDIS_URL);
  if (!connection) {
    console.warn(`[QUEUE][${name}] REDIS_URL not configured — queue is unavailable`);
    return null;
  }

  try {
    const queue = new Queue(name, { connection, defaultJobOptions });

    queue.on('error', (err: Error) => {
      console.error(`[QUEUE][${name}][ERROR]`, err.message);
    });

    return queue;
  } catch (err) {
    console.error(`[QUEUE][${name}][INIT_FAILED]`, err);
    return null;
  }
}

// ─── Lazy singleton instances ────────────────────────────────────────────────

let _recommendationQueue: Queue | null = null;
let _analyticsQueue:      Queue | null = null;
let _cacheRefreshQueue:   Queue | null = null;
let _embeddingQueue:      Queue | null = null;

/** Returns the recommendation-scores queue, or null if Redis is unavailable. */
export function getRecommendationQueue(): Queue | null {
  if (!_recommendationQueue) {
    _recommendationQueue = createQueue(QUEUE_NAMES.RECOMMENDATIONS);
  }
  return _recommendationQueue;
}

/** Returns the candidate-analytics queue, or null if Redis is unavailable. */
export function getAnalyticsQueue(): Queue | null {
  if (!_analyticsQueue) {
    _analyticsQueue = createQueue(QUEUE_NAMES.ANALYTICS);
  }
  return _analyticsQueue;
}

/** Returns the cache-refresh queue, or null if Redis is unavailable. */
export function getCacheRefreshQueue(): Queue | null {
  if (!_cacheRefreshQueue) {
    _cacheRefreshQueue = createQueue(QUEUE_NAMES.CACHE_REFRESH);
  }
  return _cacheRefreshQueue;
}

/** Returns the embedding queue, or null if Redis is unavailable. */
export function getEmbeddingQueue(): Queue | null {
  if (!_embeddingQueue) {
    _embeddingQueue = createQueue(QUEUE_NAMES.EMBEDDINGS);
  }
  return _embeddingQueue;
}
