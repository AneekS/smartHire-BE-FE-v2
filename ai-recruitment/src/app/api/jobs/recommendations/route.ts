/**
 * GET  /api/jobs/recommendations
 * POST /api/jobs/recommendations  (refresh / invalidate cache)
 *
 * Three-tier response path (target p99 < 150 ms):
 *  Tier 1 — Redis cache hit   → JSON.parse + return          (~5 ms)
 *  Tier 2 — Precomputed table → batch DB reads + cache write (~80 ms)
 *  Tier 3 — Full scoring      → service layer fallback        (~500 ms)
 *
 * After every Tier-2/3 response a background job is enqueued to keep
 * the precomputed JobRecommendationScore table and Redis cache warm.
 */

import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { CacheService } from '@/lib/cache-utils';
import { enqueueRecommendationUpdate } from '@/services/queue-producers';
import { JobRecommendationService, type RecommendationResponse } from '@/services/recommendations/job-recommendation.service';
import { publishNotificationEvent } from '@/modules/notifications/events/notification.events';
import { createNotification } from '@/modules/notifications/services/notification.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type SlimJob = {
  id:        string;
  title:     string;
  location:  string;
  createdAt: Date;
  company:   { id: string; name: string; industry: string | null };
  _count:    { applications: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a RecommendationResponse from precomputed JobRecommendationScore rows. */
function buildPrecomputedResponse(
  scores: Array<{
    jobId:               string;
    skillMatchScore:      number;
    experienceMatchScore: number;
    locationMatchScore:   number;
    behaviorScore:        number;
    embeddingScore:       number;
    totalScore:          number;
  }>,
  jobMap: Map<string, SlimJob>,
): RecommendationResponse {
  const items = scores
    .map((s) => {
      const job = jobMap.get(s.jobId);
      if (!job) return null;

      return {
        id:            job.id,
        title:         job.title,
        location:      job.location,
        company:       job.company,
        matchScore:    Math.round(s.totalScore),
        skillMatch:    Math.round(s.skillMatchScore),
        experienceMatch: Math.round(s.experienceMatchScore),
        locationMatch: Math.round(s.locationMatchScore),
        reasons:       [],          // populated by the full scoring path
        missingSkills: [],
        readinessScore: 0,
        semanticScore: Math.round(s.embeddingScore),
        postedAt:      job.createdAt.toISOString(),
        applicants:    job._count.applications,
      };
    })
    .filter(Boolean) as RecommendationResponse['recommendedJobs'];

  const now = Date.now();
  return {
    recommendedJobs: items,
    highMatchJobs:   items.filter((j) => j.matchScore >= 75),
    // Trending heuristic: high total score => likely high applicant interest
    trendingJobs:    items.filter((j) => j.matchScore >= 60),
    newJobs:         items.filter((j) => now - new Date(j.postedAt).getTime() <= 7 * 86_400_000),
    marketIntelligence: {
      trendingSkills:      [],
      highDemandRoles:     [],
      topHiringCompanies:  [],
    },
    nextCursor: null,
  };
}

async function maybeNotifyMatch(userId: string, userEmail: string, response: RecommendationResponse): Promise<void> {
  const top = response.recommendedJobs[0];
  if (!top) return;

  const jobComp = await prisma.job.findUnique({
    where: { id: top.id },
    select: { salaryMin: true, salaryMax: true },
  });

  const preference = await prisma.userPreference.findUnique({
    where: { userId },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!preference) return;

  const roleMatches =
    top.title.toLowerCase().includes(preference.primaryRole.toLowerCase()) ||
    preference.secondaryRoles.some((role: string) => top.title.toLowerCase().includes(role.toLowerCase()));

  const salaryMatches =
    !jobComp ||
    jobComp.salaryMin == null ||
    jobComp.salaryMax == null ||
    (preference.salaryMin <= jobComp.salaryMax && preference.salaryMax >= jobComp.salaryMin);

  if (roleMatches) {
    await publishNotificationEvent({
      type: 'JOB_MATCH_FOUND',
      userId,
      userEmail,
      userName: preference.user.name ?? undefined,
      metadata: {
        jobId: top.id,
        jobTitle: top.title,
        companyName: top.company.name,
        salaryMin: preference.salaryMin,
        salaryMax: preference.salaryMax,
      },
    });
  }

  if (salaryMatches) {
    await createNotification({
      userId,
      userEmail,
      userName: preference.user.name ?? undefined,
      eventType: 'SALARY_MATCH_FOUND',
      title: 'High-paying opportunity found based on your expectations',
      message: `${top.title} at ${top.company.name} matches your salary target.`,
      metadata: {
        jobId: top.id,
        jobTitle: top.title,
        companyName: top.company.name,
      },
    });
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
  try {
    const url    = new URL(authedReq.url);
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const cursor = url.searchParams.get('cursor') ?? undefined;

    // Resolve candidate ------------------------------------------------------
    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          authedReq.user?.candidateId ? { id: authedReq.user.candidateId } : undefined,
          { email: authedReq.user!.email },
        ].filter(Boolean) as Array<{ id?: string; email?: string }>,
      },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
    }

    const { id: candidateId } = candidate;

    // ── TIER 1: Redis cache ──────────────────────────────────────────────────
    // Only cache the first page (no cursor) to keep the cache small and deterministic.
    if (!cursor) {
      const cached = await CacheService.getRecommendations<RecommendationResponse>(candidateId);
      if (cached) {
        return NextResponse.json({
          success:   true,
          data:      cached,
          source:    'cache',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ── TIER 2: Precomputed JobRecommendationScore ──────────────────────────
    if (!cursor) {
      const precomputed = await prisma.jobRecommendationScore.findMany({
        where:   {
          candidateId,
          job: { status: 'ACTIVE' },
        },
        orderBy: { totalScore: 'desc' },
        take:    limit,
        select: {
          jobId:               true,
          skillMatchScore:      true,
          experienceMatchScore: true,
          locationMatchScore:   true,
          behaviorScore:        true,
          embeddingScore:       true,
          totalScore:          true,
        },
      });

      if (precomputed.length > 0) {
        const jobIds = precomputed.map((s: { jobId: string }) => s.jobId);

        const jobs = await prisma.job.findMany({
          where:  { id: { in: jobIds }, status: 'ACTIVE' },
          select: {
            id: true, title: true, location: true, createdAt: true,
            company: { select: { id: true, name: true, industry: true } },
            _count:  { select: { applications: true } },
          },
        });

        const jobMap = new Map(jobs.map((j) => [j.id, j as SlimJob]));
        const response = buildPrecomputedResponse(precomputed, jobMap);

        // Warm cache for next request
        await CacheService.setRecommendations(candidateId, response);

        // Enqueue background refresh so scores stay current
        void enqueueRecommendationUpdate(candidateId);
        void maybeNotifyMatch(authedReq.user!.id, authedReq.user!.email, response);

        return NextResponse.json({
          success:   true,
          data:      response,
          source:    'precomputed',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ── TIER 3: Full scoring fallback ────────────────────────────────────────
    const service  = new JobRecommendationService();
    const response = await service.getRecommendations({
      candidateId,
      email: authedReq.user!.email,
      limit,
      cursor,
    });

    // Cache and enqueue background score precomputation
    if (!cursor) {
      await CacheService.setRecommendations(candidateId, response);
      void enqueueRecommendationUpdate(candidateId);
      void maybeNotifyMatch(authedReq.user!.id, authedReq.user!.email, response);
    }

    return NextResponse.json({
      success:   true,
      data:      response,
      source:    'computed',
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[API][recommendations][GET]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job recommendations' },
      { status: 500 },
    );
  }
  }); // withAuth
}

// ─── POST handler (cache invalidation) ───────────────────────────────────────

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
  try {
    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          authedReq.user?.candidateId ? { id: authedReq.user.candidateId } : undefined,
          { email: authedReq.user!.email },
        ].filter(Boolean) as Array<{ id?: string; email?: string }>,
      },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
    }

    await CacheService.invalidateRecommendations(candidate.id);
    void enqueueRecommendationUpdate(candidate.id);

    return NextResponse.json({
      success: true,
      message: 'Recommendation cache invalidated; background refresh enqueued',
    });

  } catch (err) {
    console.error('[API][recommendations][POST]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to invalidate cache' },
      { status: 500 },
    );
  }
  }); // withAuth
}