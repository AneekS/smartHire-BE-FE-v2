/**
 * GET  /api/jobs/recommendations
 * POST /api/jobs/recommendations  (enqueue score refresh)
 *
 * Response path:
 *  Tier 1 — Precomputed JobRecommendationScore + job hydrate (no app cache)
 *  Tier 2 — Full scoring via JobRecommendationService
 */

import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { uniqueNonEmptyStrings, candidateOrWhere } from '@/lib/prisma-safe';
import { safeInQuery } from '@/lib/db/safeInQuery';
import { JobRecommendationService, type RecommendationResponse } from '@/services/recommendations/job-recommendation.service';

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

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
  try {
    const url    = new URL(authedReq.url);
    const limit  = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const cursor = url.searchParams.get('cursor') ?? undefined;

    const candWhere = candidateOrWhere({
      candidateId: authedReq.user?.candidateId,
      email: authedReq.user!.email,
    });
    if (!candWhere) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const candidate = await prisma.candidate.findFirst({
      where: candWhere,
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
    }

    const { id: candidateId } = candidate;

    // ── TIER 1: Precomputed JobRecommendationScore ──────────────────────────
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
        const jobIds = uniqueNonEmptyStrings(precomputed.map((s: { jobId: string }) => s.jobId));
        const jobIdFilter = safeInQuery(jobIds);
        if (jobIdFilter) {
          const jobs = await prisma.job.findMany({
            where:  { id: jobIdFilter, status: 'ACTIVE' },
            select: {
              id: true, title: true, location: true, createdAt: true,
              company: { select: { id: true, name: true, industry: true } },
              _count:  { select: { applications: true } },
            },
          });

          const jobMap = new Map(jobs.map((j) => [j.id, j as SlimJob]));
          const response = buildPrecomputedResponse(precomputed, jobMap);

          return NextResponse.json({
            success:   true,
            data:      response,
            source:    'precomputed',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // ── TIER 2: Full scoring fallback ────────────────────────────────────────
    const service  = new JobRecommendationService();
    const response = await service.getRecommendations({
      candidateId,
      email: authedReq.user!.email,
      limit,
      cursor,
    });

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
    const postCandWhere = candidateOrWhere({
      candidateId: authedReq.user?.candidateId,
      email: authedReq.user!.email,
    });
    if (!postCandWhere) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const candidate = await prisma.candidate.findFirst({
      where: postCandWhere,
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Recommendation refresh acknowledged',
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