/**
 * Redis Cache Utilities
 *
 * Type-safe, key-namespaced cache helpers built on the global ioredis client.
 * All operations swallow errors and log them — callers never crash due to cache
 * unavailability.
 *
 * Standard TTL: 600 seconds (10 minutes) for all public-facing API caches.
 *
 * Cache key schema
 * ─────────────────────────────────────────
 *  profile:{candidateId}
 *  recommendations:{candidateId}
 *  job:{jobId}
 *  jobs:search:{sha256-hash-16}
 *  saved-jobs:{candidateId}
 *  analytics:{candidateId}
 */

import { createHash } from 'crypto';
import { redis } from '@/lib/redis';

// ─── TTL constant ────────────────────────────────────────────────────────────

export const CACHE_TTL_SECONDS = 600; // 10 minutes

// ─── Key builders ────────────────────────────────────────────────────────────

export const CacheKey = {
  profile:         (candidateId: string) => `profile:${candidateId}`,
  recommendations: (candidateId: string) => `recommendations:${candidateId}`,
  job:             (jobId: string)        => `job:${jobId}`,
  jobSearch:       (params: Record<string, unknown>) => {
    const hash = createHash('sha256')
      .update(JSON.stringify(params))
      .digest('hex')
      .slice(0, 16);
    return `jobs:search:${hash}`;
  },
  savedJobs:  (candidateId: string) => `saved-jobs:${candidateId}`,
  analytics:  (candidateId: string) => `analytics:${candidateId}`,
} as const;

// ─── Low-level primitives ────────────────────────────────────────────────────

async function safeGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[CACHE][GET] key=${key}`, err);
    return null;
  }
}

async function safeSet<T>(key: string, value: T, ttl: number = CACHE_TTL_SECONDS): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.error(`[CACHE][SET] key=${key}`, err);
  }
}

async function safeDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[CACHE][DEL] key=${key}`, err);
  }
}

async function safeMDel(keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error('[CACHE][MDEL]', err);
  }
}

// ─── Public service ──────────────────────────────────────────────────────────

/**
 * CacheService — typed helpers for each endpoint cache.
 *
 * Cache flow (enforced by callers):
 *  1. call get*()   → cache hit? return
 *  2. query DB
 *  3. call set*()   → store with 600 s TTL
 */
export const CacheService = {
  // ── Generics ──────────────────────────────────────────────────────────────
  get:  safeGet,
  set:  safeSet,
  del:  safeDel,
  mDel: safeMDel,

  // ── Candidate profile ─────────────────────────────────────────────────────
  getProfile<T>(candidateId: string) {
    return safeGet<T>(CacheKey.profile(candidateId));
  },
  setProfile<T>(candidateId: string, data: T, ttl = CACHE_TTL_SECONDS) {
    return safeSet(CacheKey.profile(candidateId), data, ttl);
  },
  invalidateProfile(candidateId: string) {
    return safeDel(CacheKey.profile(candidateId));
  },

  // ── Job recommendations ───────────────────────────────────────────────────
  getRecommendations<T>(candidateId: string) {
    return safeGet<T>(CacheKey.recommendations(candidateId));
  },
  setRecommendations<T>(candidateId: string, data: T, ttl = CACHE_TTL_SECONDS) {
    return safeSet(CacheKey.recommendations(candidateId), data, ttl);
  },
  invalidateRecommendations(candidateId: string) {
    return safeDel(CacheKey.recommendations(candidateId));
  },

  // ── Individual job ────────────────────────────────────────────────────────
  getJob<T>(jobId: string) {
    return safeGet<T>(CacheKey.job(jobId));
  },
  setJob<T>(jobId: string, data: T, ttl = CACHE_TTL_SECONDS) {
    return safeSet(CacheKey.job(jobId), data, ttl);
  },
  invalidateJob(jobId: string) {
    return safeDel(CacheKey.job(jobId));
  },

  // ── Job search results ────────────────────────────────────────────────────
  getJobSearch<T>(params: Record<string, unknown>) {
    return safeGet<T>(CacheKey.jobSearch(params));
  },
  setJobSearch<T>(params: Record<string, unknown>, data: T, ttl = CACHE_TTL_SECONDS) {
    return safeSet(CacheKey.jobSearch(params), data, ttl);
  },
  invalidateJobSearch(params: Record<string, unknown>) {
    return safeDel(CacheKey.jobSearch(params));
  },

  // ── Saved jobs ────────────────────────────────────────────────────────────
  getSavedJobs<T>(candidateId: string) {
    return safeGet<T>(CacheKey.savedJobs(candidateId));
  },
  setSavedJobs<T>(candidateId: string, data: T, ttl = CACHE_TTL_SECONDS) {
    return safeSet(CacheKey.savedJobs(candidateId), data, ttl);
  },
  invalidateSavedJobs(candidateId: string) {
    return safeDel(CacheKey.savedJobs(candidateId));
  },

  // ── Candidate analytics ───────────────────────────────────────────────────
  getAnalytics<T>(candidateId: string) {
    return safeGet<T>(CacheKey.analytics(candidateId));
  },
  setAnalytics<T>(candidateId: string, data: T, ttl = CACHE_TTL_SECONDS) {
    return safeSet(CacheKey.analytics(candidateId), data, ttl);
  },
  invalidateAnalytics(candidateId: string) {
    return safeDel(CacheKey.analytics(candidateId));
  },

  // ── Bulk invalidation (e.g. on profile update) ────────────────────────────
  invalidateCandidate(candidateId: string) {
    return safeMDel([
      CacheKey.profile(candidateId),
      CacheKey.recommendations(candidateId),
      CacheKey.savedJobs(candidateId),
      CacheKey.analytics(candidateId),
    ]);
  },
};
