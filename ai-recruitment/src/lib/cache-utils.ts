/**
 * Namespaced cache helpers — all no-ops. BullMQ workers may still set REDIS_URL
 * for queues only; this module does not open Redis connections.
 */

import { createHash } from "crypto";

export const CACHE_TTL_SECONDS = 600;

export const CacheKey = {
  profile: (candidateId: string) => `profile:${candidateId}`,
  recommendations: (candidateId: string) => `recommendations:${candidateId}`,
  job: (jobId: string) => `job:${jobId}`,
  jobSearch: (params: Record<string, unknown>) => {
    const hash = createHash("sha256")
      .update(JSON.stringify(params))
      .digest("hex")
      .slice(0, 16);
    return `jobs:search:${hash}`;
  },
  savedJobs: (candidateId: string) => `saved-jobs:${candidateId}`,
  analytics: (candidateId: string) => `analytics:${candidateId}`,
} as const;

export const CacheService = {
  get: async <T>(_key: string): Promise<T | null> => null,
  set: async <T>(_key: string, _value: T, _ttl: number = CACHE_TTL_SECONDS): Promise<void> => {},
  del: async (_key: string): Promise<void> => {},
  mDel: async (_keys: string[]): Promise<void> => {},

  getProfile<T>(_candidateId: string) {
    return Promise.resolve(null) as Promise<T | null>;
  },
  setProfile<T>(_candidateId: string, _data: T, _ttl = CACHE_TTL_SECONDS) {
    return Promise.resolve();
  },
  invalidateProfile(_candidateId: string) {
    return Promise.resolve();
  },

  getRecommendations<T>(_candidateId: string) {
    return Promise.resolve(null) as Promise<T | null>;
  },
  setRecommendations<T>(_candidateId: string, _data: T, _ttl = CACHE_TTL_SECONDS) {
    return Promise.resolve();
  },
  invalidateRecommendations(_candidateId: string) {
    return Promise.resolve();
  },

  getJob<T>(_jobId: string) {
    return Promise.resolve(null) as Promise<T | null>;
  },
  setJob<T>(_jobId: string, _data: T, _ttl = CACHE_TTL_SECONDS) {
    return Promise.resolve();
  },
  invalidateJob(_jobId: string) {
    return Promise.resolve();
  },

  getJobSearch<T>(_params: Record<string, unknown>) {
    return Promise.resolve(null) as Promise<T | null>;
  },
  setJobSearch<T>(_params: Record<string, unknown>, _data: T, _ttl = CACHE_TTL_SECONDS) {
    return Promise.resolve();
  },
  invalidateJobSearch(_params: Record<string, unknown>) {
    return Promise.resolve();
  },

  getSavedJobs<T>(_candidateId: string) {
    return Promise.resolve(null) as Promise<T | null>;
  },
  setSavedJobs<T>(_candidateId: string, _data: T, _ttl = CACHE_TTL_SECONDS) {
    return Promise.resolve();
  },
  invalidateSavedJobs(_candidateId: string) {
    return Promise.resolve();
  },

  getAnalytics<T>(_candidateId: string) {
    return Promise.resolve(null) as Promise<T | null>;
  },
  setAnalytics<T>(_candidateId: string, _data: T, _ttl = CACHE_TTL_SECONDS) {
    return Promise.resolve();
  },
  invalidateAnalytics(_candidateId: string) {
    return Promise.resolve();
  },

  invalidateCandidate(_candidateId: string) {
    return Promise.resolve();
  },
};
