/**
 * Recommendation Worker  (src/workers/recommendationWorker.ts)
 *
 * Consumes jobs from the `recommendation-scores` queue.
 * For each candidateId it:
 *  1. Loads the candidate's full context (skills, experience, preferences, resume)
 *  2. Fetches the latest 100 active jobs
 *  3. Loads precomputed job embeddings from the DB
 *  4. Generates / reuses the candidate's resume embedding
 *  5. Computes all six score dimensions for each job
 *  6. Batch-upserts results into `JobRecommendationScore`
 *  7. Invalidates the `recommendations:{candidateId}` Redis key
 *
 * Run independently of the API server:
 *   npx tsx src/workers/recommendationWorker.ts
 *   (or via `npm run worker:recommendations`)
 *
 * Scales horizontally — deploy N processes on N machines.
 * Concurrency controlled by RECOMMENDATION_WORKER_CONCURRENCY (default 3).
 */

import { Worker } from 'bullmq';
import { getBullConnectionOptions } from '@/lib/redis-options';
import { QUEUE_NAMES } from '@/lib/queues';
import { prisma } from '@/lib/db';
import { CacheService } from '@/lib/cache-utils';
import { RecommendationRepository } from '@/repositories/recommendations/recommendation.repository';
import {
  calculateBehavioralScore,
  calculateCareerPathBoost,
  calculateExperienceMatch,
  calculateLocationMatch,
  calculateMatchScore,
  calculateRolePreferenceBoost,
  calculateSalaryFit,
  calculateSkillMatch,
  inferCareerPathStage,
} from '@/utils/recommendations/scoring';
import {
  cosineSimilarity,
  embeddingChecksum,
  embeddingDimensions,
  generateEmbedding,
} from '@/utils/recommendations/embedding';

// ─── Bootstrap guard ─────────────────────────────────────────────────────────

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is required to run the recommendation worker');
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_BATCH_SIZE  = 100;
const LOOKBACK_DAYS   = 90;

// ─── Shared instances ─────────────────────────────────────────────────────────

const repository = new RecommendationRepository();

// ─── Core logic ───────────────────────────────────────────────────────────────

type JobPayload = { candidateId: string };

async function processRecommendationScores(candidateId: string): Promise<void> {
  const candidate = await repository.getCandidateContext(candidateId);
  if (!candidate) {
    console.warn('[WORKER][RECOMMENDATION] Candidate not found:', candidateId);
    return;
  }

  // 1. Fetch active jobs (most recent first, capped at JOB_BATCH_SIZE)
  const jobs = await prisma.job.findMany({
    where:   { status: 'ACTIVE' },
    select: {
      id:             true,
      title:          true,
      location:       true,
      workMode:       true,
      salaryMin:      true,
      salaryMax:      true,
      experienceMin:  true,
      experienceMax:  true,
      requiredSkills: true,
      company: { select: { id: true, name: true, industry: true } },
    },
    orderBy: { createdAt: 'desc' },
    take:    JOB_BATCH_SIZE,
  });

  if (!jobs.length) return;

  // 2. Behavior signals (role affinity, industry affinity, negative signals)
  const behaviorSummary = await repository.getBehaviorSummary(candidateId, LOOKBACK_DAYS);

  // 3. Resume embedding (generate fresh or reuse if unchanged)
  const resumeText      = candidate.resumeText ?? '';
  const storedEmbedding = await repository.getLatestResumeEmbedding(candidateId);
  const checksum        = embeddingChecksum(resumeText);
  const resumeEmbedding =
    storedEmbedding?.checksum === checksum && storedEmbedding.embedding.length
      ? storedEmbedding.embedding
      : resumeText
        ? await generateEmbedding(resumeText)
        : [];

  if (storedEmbedding?.checksum !== checksum && resumeEmbedding.length) {
    await repository.upsertResumeEmbedding({
      candidateId,
      checksum,
      embedding:  resumeEmbedding,
      dimensions: embeddingDimensions,
    });
  }

  // 4. Job embeddings (batch fetch)
  const existingJobEmbeddings = await repository.getJobEmbeddings(jobs.map((j) => j.id));
  const embeddingByJobId      = new Map(existingJobEmbeddings.map((r) => [r.jobId, r.embedding]));

  const stage = inferCareerPathStage(candidate.experience);

  // ── Helper: pick the best matching signal token ───────────────────────────
  function affinityScore(
    token: string,
    signals: Array<{ token: string; score: number }>,
  ): number {
    const norm = token.trim().toLowerCase();
    const hit  = signals.find(
      (s) => norm.includes(s.token) || s.token.includes(norm),
    );
    return hit?.score ?? 0;
  }

  // 5. Score every job
  const scores = jobs.map((job) => {
    const skillMatchScore      = calculateSkillMatch(candidate.skills, job.requiredSkills);
    const experienceMatchScore = calculateExperienceMatch(
      candidate.experience,
      job.experienceMin,
      job.experienceMax,
    );
    const locationMatchScore = calculateLocationMatch({
      candidateLocation:  candidate.location,
      preferredLocations: candidate.preferredLocations,
      jobLocation:        job.location,
      workMode:           job.workMode,
      openToRelocation:   candidate.openToRelocation,
    });

    const salaryFit = calculateSalaryFit({
      expectedMin: candidate.expectedSalaryMin,
      expectedMax: candidate.expectedSalaryMax,
      jobMin:      job.salaryMin,
      jobMax:      job.salaryMax,
    });

    const roleAffinity     = affinityScore(job.title,                  behaviorSummary.roleSignals);
    const industryAffinity = affinityScore(job.company.industry ?? '', behaviorSummary.industrySignals);
    const negativeAffinity = affinityScore(job.title,                  behaviorSummary.negativeSignals);

    const behaviorScore = calculateBehavioralScore({
      roleAffinity,
      industryAffinity,
      negativeAffinity,
    });

    const rolePreferenceBoost = calculateRolePreferenceBoost({
      preferredRoles:       candidate.preferredRoles,
      preferredIndustries:  candidate.preferredIndustries,
      title:                job.title,
      industry:             job.company.industry,
      workMode:             job.workMode,
      preferredWorkMode:    candidate.preferredWorkMode,
    });

    const careerPathBoost = calculateCareerPathBoost({ stage, title: job.title });

    const jobEmb        = embeddingByJobId.get(job.id) ?? [];
    const embeddingScore =
      resumeEmbedding.length && jobEmb.length
        ? Math.round(cosineSimilarity(resumeEmbedding, jobEmb) * 100)
        : 0;

    const totalScore = calculateMatchScore({
      skillMatch:        skillMatchScore,
      experienceMatch:   experienceMatchScore,
      locationMatch:     locationMatchScore,
      salaryFit,
      behavioralScore:   behaviorScore,
      semanticScore:     embeddingScore,
      rolePreferenceBoost,
      careerPathBoost,
    });

    return {
      candidateId,
      jobId:               job.id,
      skillMatchScore,
      experienceMatchScore,
      locationMatchScore,
      behaviorScore,
      embeddingScore,
      totalScore,
    };
  });

  // 6. Batch upsert into JobRecommendationScore
  await prisma.$transaction(
    scores.map((score) =>
      prisma.jobRecommendationScore.upsert({
        where: {
          candidateId_jobId: {
            candidateId: score.candidateId,
            jobId:       score.jobId,
          },
        },
        update: {
          skillMatchScore:      score.skillMatchScore,
          experienceMatchScore: score.experienceMatchScore,
          locationMatchScore:   score.locationMatchScore,
          behaviorScore:        score.behaviorScore,
          embeddingScore:       score.embeddingScore,
          totalScore:           score.totalScore,
        },
        create: score,
      }),
    ),
  );

  // 7. Bust the recommendations Redis cache so the next GET is fresh
  await CacheService.invalidateRecommendations(candidateId);

  console.log(
    `[WORKER][RECOMMENDATION] Scored ${scores.length} jobs for candidate ${candidateId}`,
  );
}

// ─── Worker bootstrap ─────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) {
    throw new Error('Failed to parse REDIS_URL for recommendation worker');
  }

  const worker = new Worker<JobPayload>(
    QUEUE_NAMES.RECOMMENDATIONS,
    async (job) => {
      if (job.name === 'precompute-recommendation-scores') {
        await processRecommendationScores(job.data.candidateId);
      }
    },
    {
      connection,
      concurrency: Number(process.env.RECOMMENDATION_WORKER_CONCURRENCY ?? 3),
    },
  );

  worker.on('failed', (job, error) => {
    console.error('[WORKER][RECOMMENDATION][FAILED]', job?.id, error.message);
  });

  worker.on('completed', (job) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[WORKER][RECOMMENDATION][DONE]', job.id);
    }
  });

  console.log('[WORKER][RECOMMENDATION] Started');
}

void bootstrap();
