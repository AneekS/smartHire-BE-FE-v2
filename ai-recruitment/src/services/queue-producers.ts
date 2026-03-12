/**
 * Queue Producer Service
 *
 * Exposes three fire-and-forget functions that API routes call instead of
 * doing heavy work synchronously.  Each function:
 *  - obtains the relevant queue (lazy singleton, degrades when Redis is absent)
 *  - enqueues the job with a deterministic jobId to de-duplicate duplicate events
 *  - wraps the entire call in try/catch — the caller never crashes due to queue errors
 *
 * Usage in an API route:
 *   await enqueueRecommendationUpdate(candidateId);  // non-blocking, <1 ms
 */

import { getRecommendationQueue, getAnalyticsQueue, getCacheRefreshQueue, getEmbeddingQueue } from '@/lib/queues';

// ─── Recommendation scores ───────────────────────────────────────────────────

/**
 * Enqueue a background job that will precompute `JobRecommendationScore` rows
 * for the given candidate against all active jobs, then invalidate the
 * `recommendations:{candidateId}` Redis cache.
 */
export async function enqueueRecommendationUpdate(candidateId: string): Promise<void> {
  const queue = getRecommendationQueue();
  if (!queue) {
    console.warn('[PRODUCER][RECOMMENDATION] Queue unavailable — skipping for', candidateId);
    return;
  }

  try {
    await queue.add(
      'precompute-recommendation-scores',
      { candidateId },
      { jobId: `rec-score:${candidateId}` },
    );
  } catch (err) {
    console.error('[PRODUCER][RECOMMENDATION][FAILED]', candidateId, err);
  }
}

// ─── Candidate analytics ─────────────────────────────────────────────────────

/**
 * Enqueue a background job that will aggregate the candidate's application
 * statistics into the `CandidateAnalytics` table, then invalidate the
 * `analytics:{candidateId}` Redis cache.
 */
export async function enqueueAnalyticsUpdate(candidateId: string): Promise<void> {
  const queue = getAnalyticsQueue();
  if (!queue) {
    console.warn('[PRODUCER][ANALYTICS] Queue unavailable — skipping for', candidateId);
    return;
  }

  try {
    await queue.add(
      'aggregate-candidate-analytics',
      { candidateId },
      { jobId: `analytics:${candidateId}` },
    );
  } catch (err) {
    console.error('[PRODUCER][ANALYTICS][FAILED]', candidateId, err);
  }
}

// ─── Cache refresh ───────────────────────────────────────────────────────────

/**
 * Enqueue a background job that will delete (invalidate) the given Redis key.
 * Use this when you want cache eviction to happen outside the request lifecycle.
 *
 * @param key  Full Redis key, e.g. `CacheKey.profile(candidateId)`.
 */
export async function enqueueCacheRefresh(key: string): Promise<void> {
  const queue = getCacheRefreshQueue();
  if (!queue) {
    console.warn('[PRODUCER][CACHE_REFRESH] Queue unavailable — skipping for', key);
    return;
  }

  try {
    await queue.add(
      'refresh-cache',
      { key },
      { jobId: `cache-refresh:${key}` },
    );
  } catch (err) {
    console.error('[PRODUCER][CACHE_REFRESH][FAILED]', key, err);
  }
}

// ─── Embedding jobs ──────────────────────────────────────────────────────────

/**
 * Enqueue a resume embedding generation job.
 * The embedding worker upserts the result into `ResumeEmbedding`,
 * de-duplicating by checksum so unchanged resumes are skipped.
 */
export async function enqueueEmbeddingResumeJob(data: {
  candidateId: string;
  resumeText: string;
}): Promise<void> {
  const queue = getEmbeddingQueue();
  if (!queue) {
    console.warn('[PRODUCER][EMBEDDING] Queue unavailable — skipping resume embed for', data.candidateId);
    return;
  }

  try {
    await queue.add('embed-resume', data, {
      jobId: `embed-resume:${data.candidateId}`,
    });
  } catch (err) {
    console.error('[PRODUCER][EMBEDDING][RESUME][FAILED]', data.candidateId, err);
  }
}

/**
 * Enqueue a job-description embedding generation job.
 * The embedding worker upserts the result into `JobEmbedding`.
 */
export async function enqueueEmbeddingJob(data: {
  jobId: string;
  content: string;
}): Promise<void> {
  const queue = getEmbeddingQueue();
  if (!queue) {
    console.warn('[PRODUCER][EMBEDDING] Queue unavailable — skipping job embed for', data.jobId);
    return;
  }

  try {
    await queue.add('embed-job', data, {
      jobId: `embed-job:${data.jobId}`,
    });
  } catch (err) {
    console.error('[PRODUCER][EMBEDDING][JOB][FAILED]', data.jobId, err);
  }
}
