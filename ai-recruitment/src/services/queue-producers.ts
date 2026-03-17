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
import { safeId } from '@/lib/utils/safeId';

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
    const eventId = safeId(`rec-score-${candidateId}`);
    await queue.add(
      'precompute-recommendation-scores',
      { candidateId },
      { jobId: eventId },
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
    const eventId = safeId(`analytics-${candidateId}`);
    await queue.add(
      'aggregate-candidate-analytics',
      { candidateId },
      { jobId: eventId },
    );
  } catch (err) {
    console.error('[PRODUCER][ANALYTICS][FAILED]', candidateId, err);
  }
}

/**
 * Enqueue a background job to recompute role-fit scores for a user.
 */
export async function enqueueRoleFitScoreUpdate(userId: string): Promise<void> {
  const queue = getAnalyticsQueue();
  if (!queue) {
    console.warn('[PRODUCER][ROLE_FIT] Queue unavailable - skipping for', userId);
    return;
  }

  const eventId = safeId(`role-fit-${userId}`);
  console.log('[ROLE_FIT PRODUCER] eventId:', eventId);

  try {
    await queue.add(
      'compute-role-fit-scores',
      { userId },
      { jobId: eventId },
    );
  } catch (err) {
    console.error('[ROLE_FIT ERROR]', err);
    console.error('[PRODUCER][ROLE_FIT][FAILED]', userId, err);
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
    const eventId = safeId(`cache-refresh-${key}`);
    await queue.add(
      'refresh-cache',
      { key },
      { jobId: eventId },
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
    const eventId = safeId(`embed-resume-${data.candidateId}`);
    await queue.add('embed-resume', data, {
      jobId: eventId,
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
    const eventId = safeId(`embed-job-${data.jobId}`);
    await queue.add('embed-job', data, {
      jobId: eventId,
    });
  } catch (err) {
    console.error('[PRODUCER][EMBEDDING][JOB][FAILED]', data.jobId, err);
  }
}
