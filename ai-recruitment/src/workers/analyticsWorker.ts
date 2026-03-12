/**
 * Analytics Worker  (src/workers/analyticsWorker.ts)
 *
 * Consumes jobs from the `candidate-analytics` queue.
 * For each candidateId it:
 *  1. Queries all applications for that candidate
 *  2. Aggregates status counts, interview counts, offer/hire/reject rates,
 *     average application-health score, and a rough response-time estimate
 *  3. Upserts the result into `CandidateAnalytics`
 *  4. Invalidates the `analytics:{candidateId}` Redis cache
 *
 * Run independently of the API server:
 *   npx tsx src/workers/analyticsWorker.ts
 *   (or via `npm run worker:analytics`)
 *
 * Scales horizontally — deploy N processes on N machines.
 * Concurrency controlled by ANALYTICS_WORKER_CONCURRENCY (default 5).
 */

import { Worker } from 'bullmq';
import { getBullConnectionOptions } from '@/lib/redis-options';
import { QUEUE_NAMES } from '@/lib/queues';
import { prisma } from '@/lib/db';
import { CacheService } from '@/lib/cache-utils';

// ─── Bootstrap guard ─────────────────────────────────────────────────────────

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is required to run the analytics worker');
}

// ─── Core logic ───────────────────────────────────────────────────────────────

type JobPayload = { candidateId: string };

async function aggregateCandidateAnalytics(candidateId: string): Promise<void> {
  const applications = await prisma.application.findMany({
    where:  { candidateId },
    select: {
      status:                 true,
      applicationHealthScore: true,
      createdAt:              true,
      updatedAt:              true,
    },
  });

  if (!applications.length) return;

  const counts = {
    applicationsSent: applications.length,
    shortlistedCount: 0,
    interviewCount:   0,
    offerCount:       0,
    hiredCount:       0,
    rejectedCount:    0,
    withdrawnCount:   0,
  };

  let totalHealthScore  = 0;
  let healthScoreCount  = 0;
  let totalResponseTime = 0;  // ms between submit and last status update
  let responseTimeCount = 0;

  for (const app of applications) {
    switch (app.status) {
      case 'SHORTLISTED':          counts.shortlistedCount++; break;
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_COMPLETED':  counts.interviewCount++;   break;
      case 'OFFER':                counts.offerCount++;       break;
      case 'HIRED':                counts.hiredCount++;       break;
      case 'REJECTED':             counts.rejectedCount++;    break;
      case 'WITHDRAWN':            counts.withdrawnCount++;   break;
    }

    if (app.applicationHealthScore != null) {
      totalHealthScore += app.applicationHealthScore;
      healthScoreCount++;
    }

    // Approximate recruiter response time
    if (app.status !== 'APPLIED' && app.status !== 'WITHDRAWN') {
      totalResponseTime += app.updatedAt.getTime() - app.createdAt.getTime();
      responseTimeCount++;
    }
  }

  const avgHealthScore = healthScoreCount > 0
    ? Math.round((totalHealthScore / healthScoreCount) * 100) / 100
    : 0;

  // avgResponseTime stored in hours (easier to display)
  const avgResponseTime = responseTimeCount > 0
    ? Math.round((totalResponseTime / responseTimeCount) / (1000 * 60 * 60) * 10) / 10
    : null;

  await prisma.candidateAnalytics.upsert({
    where:  { candidateId },
    create: {
      candidateId,
      ...counts,
      avgHealthScore,
      avgResponseTime,
      lastUpdatedAt: new Date(),
    },
    update: {
      ...counts,
      avgHealthScore,
      avgResponseTime,
      lastUpdatedAt: new Date(),
    },
  });

  await CacheService.invalidateAnalytics(candidateId);

  console.log(
    `[WORKER][ANALYTICS] Updated analytics for candidate ${candidateId}`,
    `(${applications.length} applications)`,
  );
}

// ─── Worker bootstrap ─────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) {
    throw new Error('Failed to parse REDIS_URL for analytics worker');
  }

  const worker = new Worker<JobPayload>(
    QUEUE_NAMES.ANALYTICS,
    async (job) => {
      if (job.name === 'aggregate-candidate-analytics') {
        await aggregateCandidateAnalytics(job.data.candidateId);
      }
    },
    {
      connection,
      concurrency: Number(process.env.ANALYTICS_WORKER_CONCURRENCY ?? 5),
    },
  );

  worker.on('failed', (job, error) => {
    console.error('[WORKER][ANALYTICS][FAILED]', job?.id, error.message);
  });

  worker.on('completed', (job) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[WORKER][ANALYTICS][DONE]', job.id);
    }
  });

  console.log('[WORKER][ANALYTICS] Started');
}

void bootstrap();
