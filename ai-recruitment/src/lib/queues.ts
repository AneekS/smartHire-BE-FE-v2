import { Queue } from "bullmq";
import { getBullConnectionOptions } from "@/lib/redis-options";
import { EMBED_QUEUE_NAMES } from "@/queue/redis-queue";

export const QUEUE_NAMES = {
  RECOMMENDATIONS: "{recommendation-scores}",
  ANALYTICS: "{candidate-analytics}",
  CACHE_REFRESH: "{cache-refresh}",
  SALARY_INTELLIGENCE: "{salary-intelligence}",
  EMBEDDINGS: "{recommendation-embedding-jobs}",
  RESUME_PIPELINE: "{resume-parse-index}",
  RESUME_PARSE: EMBED_QUEUE_NAMES.PARSE,
  EMBED_HIGH: EMBED_QUEUE_NAMES.HIGH,
  EMBED_NORMAL: EMBED_QUEUE_NAMES.NORMAL,
  EMBED_RETRY: EMBED_QUEUE_NAMES.RETRY,
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queueCache = new Map<string, Queue>();

function getQueue(name: QueueName): Queue | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (queueCache.has(name)) return queueCache.get(name)!;

  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) return null;

  const queue = new Queue(name, { connection });
  queueCache.set(name, queue);
  return queue;
}

export function getResumePipelineQueue() {
  return getQueue(QUEUE_NAMES.RESUME_PIPELINE);
}

// Legacy queues — still return null when Redis unavailable
export function getRecommendationQueue() {
  return getQueue(QUEUE_NAMES.RECOMMENDATIONS);
}
export function getAnalyticsQueue() {
  return getQueue(QUEUE_NAMES.ANALYTICS);
}
export function getCacheRefreshQueue() {
  return getQueue(QUEUE_NAMES.CACHE_REFRESH);
}
export function getEmbeddingQueue() {
  return getQueue(QUEUE_NAMES.EMBEDDINGS);
}
export function getSalaryIntelligenceQueue() {
  return getQueue(QUEUE_NAMES.SALARY_INTELLIGENCE);
}
