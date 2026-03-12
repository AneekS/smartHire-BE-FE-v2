import { cacheGet, cacheSet } from "@/lib/cache";
import { enqueueEmbeddingJob, enqueueEmbeddingResumeJob } from "@/services/queue-producers";
import { RecommendationRepository } from "../../repositories/recommendations/recommendation.repository";
import { buildRecommendationReasons } from "@/utils/recommendations/explain";
import {
  calculateBehavioralScore,
  calculateCareerPathBoost,
  calculateExperienceMatch,
  calculateLocationMatch,
  calculateMatchScore,
  calculateRolePreferenceBoost,
  calculateSalaryFit,
  calculateSkillMatch,
  detectSkillGap,
  inferCareerPathStage,
} from "@/utils/recommendations/scoring";
import {
  cosineSimilarity,
  embeddingChecksum,
  embeddingDimensions,
  generateEmbedding,
} from "@/utils/recommendations/embedding";

const CACHE_TTL_SECONDS = 90;
const LOOKBACK_DAYS = 45;

type Cursor = {
  id: string;
  createdAt: string;
};

export type RecommendationItem = {
  id: string;
  title: string;
  location: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  matchScore: number;
  reasons: string[];
  missingSkills: string[];
  readinessScore: number;
  semanticScore: number;
  postedAt: string;
  /** Number of applicants on this job at the time of recommendation. */
  applicants?: number;
};

export type RecommendationResponse = {
  recommendedJobs: RecommendationItem[];
  trendingJobs: RecommendationItem[];
  highMatchJobs: RecommendationItem[];
  newJobs: RecommendationItem[];
  marketIntelligence: {
    trendingSkills: Array<{ skill: string; demandCount: number }>;
    highDemandRoles: Array<{ role: string; demandCount: number }>;
    topHiringCompanies: Array<{ companyName: string; activeJobs: number }>;
  };
  nextCursor: string | null;
};

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");
}

export function decodeCursor(cursor?: string): { id: string; createdAt: Date } | null {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")) as Cursor;
    if (!parsed.id || !parsed.createdAt) return null;
    return {
      id: parsed.id,
      createdAt: new Date(parsed.createdAt),
    };
  } catch {
    return null;
  }
}

function computeAffinity(token: string, signals: Array<{ token: string; score: number }>): number {
  const normalized = token.trim().toLowerCase();
  const hit = signals.find((item) => normalized.includes(item.token) || item.token.includes(normalized));
  return hit?.score ?? 0;
}

export class JobRecommendationService {
  constructor(private readonly repository = new RecommendationRepository()) {}

  async getRecommendations(input: {
    candidateId?: string;
    email?: string;
    limit: number;
    cursor?: string;
  }): Promise<RecommendationResponse> {
    const cacheKey = `job-recommendations:${input.candidateId ?? input.email ?? "anon"}:${input.limit}:${input.cursor ?? "first"}`;
    const cached = await cacheGet<RecommendationResponse>(cacheKey);
    if (cached) return cached;

    const candidate = await this.repository.getCandidateContext(input.candidateId, input.email);
    if (!candidate) {
      return {
        recommendedJobs: [],
        trendingJobs: [],
        highMatchJobs: [],
        newJobs: [],
        marketIntelligence: {
          trendingSkills: [],
          highDemandRoles: [],
          topHiringCompanies: [],
        },
        nextCursor: null,
      };
    }

    const decodedCursor = decodeCursor(input.cursor);
    const jobs = await this.repository.getJobsForRecommendation(input.limit + 1, decodedCursor ?? undefined);
    const hasMore = jobs.length > input.limit;
    const pageJobs = hasMore ? jobs.slice(0, input.limit) : jobs;

    const [behaviorSummary, marketIntelligence] = await Promise.all([
      this.repository.getBehaviorSummary(candidate.id, LOOKBACK_DAYS),
      this.repository.getMarketIntelligence(),
    ]);

    const resumeChecksum = embeddingChecksum(candidate.resumeText);
    const existingResumeEmbedding = await this.repository.getLatestResumeEmbedding(candidate.id);
    const resumeEmbedding =
      existingResumeEmbedding?.checksum === resumeChecksum
        ? existingResumeEmbedding.embedding
        : await generateEmbedding(candidate.resumeText);

    if (existingResumeEmbedding?.checksum !== resumeChecksum) {
      await enqueueEmbeddingResumeJob({
        candidateId: candidate.id,
        resumeText: candidate.resumeText,
      });

      await this.repository.upsertResumeEmbedding({
        candidateId: candidate.id,
        checksum: resumeChecksum,
        embedding: resumeEmbedding,
        dimensions: embeddingDimensions,
      });
    }

    const existingJobEmbeddings = await this.repository.getJobEmbeddings(pageJobs.map((job) => job.id));
    const embeddingByJobId = new Map(existingJobEmbeddings.map((row) => [row.jobId, row]));

    const jobsNeedingEmbeddings = pageJobs.filter((job) => {
      const checksum = embeddingChecksum(`${job.title}\n${job.description}\n${job.requirements}`);
      return embeddingByJobId.get(job.id)?.checksum !== checksum;
    });

    const generatedJobEmbeddings = await Promise.all(
      jobsNeedingEmbeddings.map(async (job) => {
        const text = `${job.title}\n${job.description}\n${job.requirements}`;
        await enqueueEmbeddingJob({
          jobId: job.id,
          content: text,
        });

        return {
          jobId: job.id,
          checksum: embeddingChecksum(text),
          embedding: await generateEmbedding(text),
          dimensions: embeddingDimensions,
        };
      })
    );

    await this.repository.upsertJobEmbeddings(generatedJobEmbeddings);

    const mergedEmbeddings = new Map<string, number[]>();
    for (const item of existingJobEmbeddings) mergedEmbeddings.set(item.jobId, item.embedding);
    for (const item of generatedJobEmbeddings) mergedEmbeddings.set(item.jobId, item.embedding);

    const stage = inferCareerPathStage(candidate.experience);

    const scoredJobs = pageJobs.map((job) => {
      const skillGap = detectSkillGap(candidate.skills, job.requiredSkills);
      const skillMatch = calculateSkillMatch(candidate.skills, job.requiredSkills);
      const experienceMatch = calculateExperienceMatch(candidate.experience, job.experienceMin, job.experienceMax);
      const locationMatch = calculateLocationMatch({
        candidateLocation: candidate.location,
        preferredLocations: candidate.preferredLocations,
        jobLocation: job.location,
        workMode: job.workMode,
        openToRelocation: candidate.openToRelocation,
      });
      const salaryFit = calculateSalaryFit({
        expectedMin: candidate.expectedSalaryMin,
        expectedMax: candidate.expectedSalaryMax,
        jobMin: job.salaryMin,
        jobMax: job.salaryMax,
      });

      const roleAffinity = computeAffinity(job.title, behaviorSummary.roleSignals);
      const industryAffinity = computeAffinity(job.company.industry ?? "", behaviorSummary.industrySignals);
      const negativeAffinity = computeAffinity(job.title, behaviorSummary.negativeSignals);
      const behavioralScore = calculateBehavioralScore({
        roleAffinity,
        industryAffinity,
        negativeAffinity,
      });

      const rolePreferenceBoost = calculateRolePreferenceBoost({
        preferredRoles: candidate.preferredRoles,
        preferredIndustries: candidate.preferredIndustries,
        title: job.title,
        industry: job.company.industry,
        workMode: job.workMode,
        preferredWorkMode: candidate.preferredWorkMode,
      });

      const careerPathBoost = calculateCareerPathBoost({
        stage,
        title: job.title,
      });

      const jobEmbedding = mergedEmbeddings.get(job.id) ?? [];
      const semanticScore = Math.round(cosineSimilarity(resumeEmbedding, jobEmbedding) * 100);

      const matchScore = calculateMatchScore({
        skillMatch,
        experienceMatch,
        locationMatch,
        salaryFit,
        behavioralScore,
        semanticScore,
        rolePreferenceBoost,
        careerPathBoost,
      });

      const reasons = buildRecommendationReasons({
        skillMatch,
        experienceMatch,
        locationMatch,
        salaryFit,
        behavioralScore,
        semanticScore,
        roleBoost: rolePreferenceBoost,
        careerBoost: careerPathBoost,
      });

      return {
        id: job.id,
        title: job.title,
        location: job.location,
        company: job.company,
        matchScore,
        skillMatch,
        experienceMatch,
        locationMatch,
        reasons,
        missingSkills: skillGap.missingSkills,
        readinessScore: skillGap.readinessScore,
        semanticScore,
        postedAt: job.createdAt.toISOString(),
        applicants: job.applicants,
      };
    });

    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    if (candidate.profileId) {
      await this.repository.persistJobRecommendations({
        profileId: candidate.profileId,
        rows: scoredJobs.slice(0, 50).map((job) => ({
          jobId: job.id,
          matchScore: job.matchScore,
          skillMatch: job.skillMatch,
          experienceMatch: job.experienceMatch,
          locationMatch: job.locationMatch,
          semanticScore: job.semanticScore,
          readinessScore: job.readinessScore,
          missingSkills: job.missingSkills,
          reasons: job.reasons,
        })),
      });
    }

    const response: RecommendationResponse = {
      recommendedJobs: scoredJobs,
      highMatchJobs: scoredJobs.filter((job) => job.matchScore >= 75),
      trendingJobs: scoredJobs.filter((job) => job.applicants >= 30),
      newJobs: scoredJobs.filter((job) => Date.now() - new Date(job.postedAt).getTime() <= 7 * 24 * 60 * 60 * 1000),
      marketIntelligence,
      nextCursor: hasMore
        ? encodeCursor({
            id: pageJobs[pageJobs.length - 1].id,
            createdAt: pageJobs[pageJobs.length - 1].createdAt.toISOString(),
          })
        : null,
    };

    await cacheSet(cacheKey, response, CACHE_TTL_SECONDS);
    return response;
  }

  async trackBehaviorEvent(input: {
    candidateId?: string;
    email?: string;
    jobId?: string;
    eventType: "JOB_VIEW" | "JOB_CLICK" | "JOB_APPLICATION" | "JOB_SAVE" | "JOB_IGNORE";
    metadata?: Record<string, unknown>;
  }) {
    const candidate = await this.repository.getCandidateContext(input.candidateId, input.email);
    if (!candidate) {
      throw new Error("Candidate not found");
    }

    return this.repository.createBehaviorEvent({
      candidateId: candidate.id,
      jobId: input.jobId,
      eventType: input.eventType,
      metadata: input.metadata,
    });
  }

  async getRecruiterCandidateMatches(input: { jobId: string; limit: number }) {
    const job = await this.repository.getJobById(input.jobId);
    if (!job) {
      return [];
    }

    const candidates = await this.repository.getCandidatesForRecruiter(input.limit);

    const ranked = candidates.map((candidate) => {
      const skillMatch = calculateSkillMatch(candidate.skills, job.requiredSkills ?? []);
      const experienceMatch = calculateExperienceMatch(candidate.experience, job.experienceMin, job.experienceMax);
      const locationMatch = calculateLocationMatch({
        candidateLocation: candidate.location,
        jobLocation: job.location,
        workMode: job.workMode,
      });
      const salaryFit = 70;
      const behavioralScore = 65;

      const matchScore = calculateMatchScore({
        skillMatch,
        experienceMatch,
        locationMatch,
        salaryFit,
        behavioralScore,
        semanticScore: 0,
        rolePreferenceBoost: 0,
        careerPathBoost: 0,
      });

      const gap = detectSkillGap(candidate.skills, job.requiredSkills ?? []);

      return {
        candidateId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        location: candidate.location,
        matchScore,
        missingSkills: gap.missingSkills,
        readinessScore: gap.readinessScore,
      };
    });

    ranked.sort((a, b) => b.matchScore - a.matchScore);
    return ranked.slice(0, input.limit);
  }

  /**
   * Fast path: read precomputed recommendations from JobRecommendation table.
   * Returns null if no precomputed scores exist (caller should fall back to full computation).
   */
  async getPrecomputedRecommendations(input: {
    candidateId?: string;
    email?: string;
    limit: number;
  }): Promise<RecommendationResponse | null> {
    const cacheKey = `job-recs-fast:${input.candidateId ?? input.email ?? "anon"}:${input.limit}`;
    const cached = await cacheGet<RecommendationResponse>(cacheKey);
    if (cached) return cached;

    const candidate = await this.repository.getCandidateContext(input.candidateId, input.email);
    if (!candidate?.profileId) return null;

    const rows = await this.repository.getPrecomputedRecommendations(candidate.profileId, input.limit);
    if (rows.length === 0) return null;

    const [marketIntelligence] = await Promise.all([
      this.repository.getMarketIntelligence(),
    ]);

    const scoredJobs: RecommendationItem[] = rows.map((row) => ({
      id: row.job.id,
      title: row.job.title,
      location: row.job.location,
      company: row.job.company,
      matchScore: row.matchScore,
      reasons: row.reasons,
      missingSkills: row.missingSkills,
      readinessScore: row.readinessScore ?? 0,
      semanticScore: row.semanticScore ?? 0,
      postedAt: row.job.createdAt.toISOString(),
    }));

    const response: RecommendationResponse = {
      recommendedJobs: scoredJobs,
      highMatchJobs: scoredJobs.filter((j) => j.matchScore >= 75),
      trendingJobs: scoredJobs.filter((j) => (rows.find((r) => r.jobId === j.id)?.job._count.applications ?? 0) >= 30),
      newJobs: scoredJobs.filter((j) => Date.now() - new Date(j.postedAt).getTime() <= 7 * 24 * 60 * 60 * 1000),
      marketIntelligence,
      nextCursor: null,
    };

    await cacheSet(cacheKey, response, CACHE_TTL_SECONDS);
    return response;
  }
}
