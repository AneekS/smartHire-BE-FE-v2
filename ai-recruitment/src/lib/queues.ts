/**
 * Queue Registry — DISABLED
 *
 * Redis / BullMQ background jobs are not active in this deployment.
 * All queue getters return null so callers degrade gracefully without
 * importing BullMQ or opening Redis connections.
 */

export const QUEUE_NAMES = {
  RECOMMENDATIONS:     'recommendation-scores',
  ANALYTICS:           'candidate-analytics',
  CACHE_REFRESH:       'cache-refresh',
  SALARY_INTELLIGENCE: 'salary-intelligence',
  EMBEDDINGS:          'recommendation-embedding-jobs',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// All getters return null — callers guard with `if (!queue) return;`
export function getRecommendationQueue()    { return null; }
export function getAnalyticsQueue()         { return null; }
export function getCacheRefreshQueue()      { return null; }
export function getEmbeddingQueue()         { return null; }
export function getSalaryIntelligenceQueue() { return null; }
