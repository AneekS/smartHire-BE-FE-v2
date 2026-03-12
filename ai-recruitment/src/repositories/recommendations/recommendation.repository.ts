import { prisma } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";

export type BehaviorEventType =
  | "JOB_VIEW"
  | "JOB_CLICK"
  | "JOB_APPLICATION"
  | "JOB_SAVE"
  | "JOB_IGNORE";

export type CandidateContext = {
  id: string;
  email: string;
  location: string | null;
  experience: number;
  skills: string[];
  preferredRoles: string[];
  preferredIndustries: string[];
  preferredLocations: string[];
  preferredWorkMode: string | null;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  openToRelocation: boolean;
  profileId: string | null;
  resumeText: string;
};

export type JobForRecommendation = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceMin: number | null;
  experienceMax: number | null;
  requiredSkills: string[];
  createdAt: Date;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  applicants: number;
};

export type CandidateForRecruiter = {
  id: string;
  name: string;
  email: string;
  location: string | null;
  experience: number;
  skills: string[];
  profileId: string | null;
};

type StoredEmbeddingRow = {
  id: string;
  ownerId: string;
  checksum: string | null;
  embedding: number[];
  dimensions: number;
  createdAt: Date;
};

export class RecommendationRepository {
  async getCandidateContext(userCandidateId?: string, email?: string): Promise<CandidateContext | null> {
    if (!userCandidateId && !email) return null;

    const cacheKey = `candidate-ctx:${userCandidateId ?? email}`;
    const cached = await cacheGet<CandidateContext>(cacheKey);
    if (cached) return cached;

    // Single relational query replaces 3 separate queries (N+1 fix)
    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          userCandidateId ? { id: userCandidateId } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean) as Array<{ id?: string; email?: string }>,
      },
      select: {
        id: true,
        email: true,
        location: true,
        experience: true,
        summary: true,
        skills: true,
        skillRecords: { select: { name: true } },
        careerPreference: true,
        profile: {
          select: {
            id: true,
            resumeRaw: { select: { extractedText: true } },
            resumeStructured: { select: { skills: true } },
          },
        },
      },
    });

    if (!candidate) return null;

    const mergedSkills = new Set<string>([
      ...(candidate.skills ?? []),
      ...candidate.skillRecords.map((skill) => skill.name),
    ]);

    const resumeText = [
      candidate.summary ?? "",
      candidate.profile?.resumeRaw?.extractedText ?? "",
      (candidate.profile?.resumeStructured?.skills ?? []).join(" "),
      Array.from(mergedSkills).join(" "),
    ]
      .filter(Boolean)
      .join(" ");

    const result: CandidateContext = {
      id: candidate.id,
      email: candidate.email,
      location: candidate.location,
      experience: candidate.experience ?? 0,
      skills: Array.from(mergedSkills),
      preferredRoles: candidate.careerPreference?.preferredRoles ?? [],
      preferredIndustries: candidate.careerPreference?.preferredIndustries ?? [],
      preferredLocations: candidate.careerPreference?.preferredLocations ?? [],
      preferredWorkMode: candidate.careerPreference?.workMode ?? null,
      expectedSalaryMin: candidate.careerPreference?.salaryMin ?? null,
      expectedSalaryMax: candidate.careerPreference?.salaryMax ?? null,
      openToRelocation: candidate.careerPreference?.openToRelocation ?? false,
      profileId: candidate.profile?.id ?? null,
      resumeText,
    };

    await cacheSet(cacheKey, result, 1800); // 30min TTL
    return result;
  }

  async getJobsForRecommendation(limit: number, cursor?: { createdAt: Date; id: string }) {
    const jobs = await prisma.job.findMany({
      where: {
        status: "ACTIVE",
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
                },
              ],
            }
          : {}),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });

    return jobs.map((job): JobForRecommendation => ({
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      location: job.location,
      workMode: job.workMode,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      requiredSkills: job.requiredSkills,
      createdAt: job.createdAt,
      company: job.company,
      applicants: job._count.applications,
    }));
  }

  async getBehaviorSummary(candidateId: string, lookbackDays: number) {
    const from = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const [roleSignals, industrySignals, negativeSignals] = await Promise.all([
      prisma.$queryRaw<Array<{ token: string; score: number }>>`
        SELECT
          LOWER(SPLIT_PART(j."title", ' ', 1)) as token,
          SUM(CASE e."eventType"
            WHEN 'JOB_APPLICATION' THEN 5
            WHEN 'JOB_SAVE' THEN 3
            WHEN 'JOB_CLICK' THEN 2
            WHEN 'JOB_VIEW' THEN 1
            ELSE 0
          END)::float as score
        FROM "BehaviorEvent" e
        JOIN "Job" j ON j."id" = e."jobId"
        WHERE e."candidateId" = ${candidateId}
          AND e."createdAt" >= ${from}
        GROUP BY 1
        ORDER BY score DESC
        LIMIT 20
      `,
      prisma.$queryRaw<Array<{ token: string; score: number }>>`
        SELECT
          LOWER(COALESCE(c."industry", '')) as token,
          SUM(CASE e."eventType"
            WHEN 'JOB_APPLICATION' THEN 4
            WHEN 'JOB_SAVE' THEN 2
            WHEN 'JOB_CLICK' THEN 1
            ELSE 0
          END)::float as score
        FROM "BehaviorEvent" e
        JOIN "Job" j ON j."id" = e."jobId"
        JOIN "Company" c ON c."id" = j."companyId"
        WHERE e."candidateId" = ${candidateId}
          AND e."createdAt" >= ${from}
        GROUP BY 1
        ORDER BY score DESC
        LIMIT 20
      `,
      prisma.$queryRaw<Array<{ token: string; score: number }>>`
        SELECT
          LOWER(SPLIT_PART(j."title", ' ', 1)) as token,
          COUNT(*)::float as score
        FROM "BehaviorEvent" e
        JOIN "Job" j ON j."id" = e."jobId"
        WHERE e."candidateId" = ${candidateId}
          AND e."eventType" = 'JOB_IGNORE'
          AND e."createdAt" >= ${from}
        GROUP BY 1
        ORDER BY score DESC
        LIMIT 20
      `,
    ]);

    return {
      roleSignals,
      industrySignals,
      negativeSignals,
    };
  }

  async getLatestResumeEmbedding(candidateId: string): Promise<StoredEmbeddingRow | null> {
    const rows = await prisma.$queryRaw<StoredEmbeddingRow[]>`
      SELECT
        "id",
        "candidateId" as "ownerId",
        "checksum",
        "embedding",
        "dimensions",
        "createdAt"
      FROM "ResumeEmbedding"
      WHERE "candidateId" = ${candidateId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async getJobEmbeddings(jobIds: string[]): Promise<Array<StoredEmbeddingRow & { jobId: string }>> {
    if (jobIds.length === 0) return [];

    return prisma.$queryRaw<Array<StoredEmbeddingRow & { jobId: string }>>`
      SELECT
        "id",
        "jobId",
        "jobId" as "ownerId",
        "checksum",
        "embedding",
        "dimensions",
        "createdAt"
      FROM "JobEmbedding"
      WHERE "jobId" = ANY(${jobIds}::text[])
    `;
  }

  async upsertResumeEmbedding(input: {
    candidateId: string;
    checksum: string;
    embedding: number[];
    dimensions: number;
  }) {
    await prisma.$executeRaw`
      INSERT INTO "ResumeEmbedding" ("id", "candidateId", "source", "dimensions", "embedding", "checksum", "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${input.candidateId}, 'RESUME', ${input.dimensions}, ${input.embedding}::float8[], ${input.checksum}, NOW(), NOW())
    `;
  }

  async upsertJobEmbeddings(
    inputs: Array<{ jobId: string; checksum: string; embedding: number[]; dimensions: number }>
  ) {
    if (inputs.length === 0) return;

    // Batch all upserts in a single transaction (reduces N round trips to 1)
    await prisma.$transaction(
      inputs.map((input) =>
        prisma.$executeRaw`
          INSERT INTO "JobEmbedding" ("id", "jobId", "source", "dimensions", "embedding", "checksum", "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${input.jobId}, 'JOB_DESCRIPTION', ${input.dimensions}, ${input.embedding}::float8[], ${input.checksum}, NOW(), NOW())
          ON CONFLICT ("jobId", "source")
          DO UPDATE SET
            "dimensions" = EXCLUDED."dimensions",
            "embedding" = EXCLUDED."embedding",
            "checksum" = EXCLUDED."checksum",
            "updatedAt" = NOW()
        `
      )
    );
  }

  async persistJobRecommendations(input: {
    profileId: string;
    rows: Array<{
      jobId: string;
      matchScore: number;
      skillMatch?: number;
      experienceMatch?: number;
      locationMatch?: number;
      semanticScore?: number;
      readinessScore?: number;
      missingSkills?: string[];
      reasons: string[];
    }>;
  }) {
    if (input.rows.length === 0) return;

    // Batch all upserts in a single transaction (reduces N round trips to 1)
    await prisma.$transaction(
      input.rows.map((row) =>
        prisma.$executeRaw`
          INSERT INTO "JobRecommendation" ("id", "profileId", "jobId", "matchScore", "skillMatch", "experienceMatch", "locationMatch", "semanticScore", "readinessScore", "missingSkills", "reasons", "createdAt")
          VALUES (${crypto.randomUUID()}, ${input.profileId}, ${row.jobId}, ${row.matchScore}, ${row.skillMatch ?? null}, ${row.experienceMatch ?? null}, ${row.locationMatch ?? null}, ${row.semanticScore ?? null}, ${row.readinessScore ?? null}, ${row.missingSkills ?? []}::text[], ${row.reasons}, NOW())
          ON CONFLICT ("profileId", "jobId")
          DO UPDATE SET
            "matchScore" = EXCLUDED."matchScore",
            "skillMatch" = EXCLUDED."skillMatch",
            "experienceMatch" = EXCLUDED."experienceMatch",
            "locationMatch" = EXCLUDED."locationMatch",
            "semanticScore" = EXCLUDED."semanticScore",
            "readinessScore" = EXCLUDED."readinessScore",
            "missingSkills" = EXCLUDED."missingSkills",
            "reasons" = EXCLUDED."reasons",
            "createdAt" = NOW()
        `
      )
    );
  }

  async createBehaviorEvent(input: {
    candidateId: string;
    jobId?: string;
    eventType: BehaviorEventType;
    metadata?: Record<string, unknown>;
  }) {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; candidateId: string; jobId: string | null; eventType: string; createdAt: Date }>
    >`
      INSERT INTO "BehaviorEvent" ("id", "candidateId", "jobId", "eventType", "metadata", "createdAt")
      VALUES (${crypto.randomUUID()}, ${input.candidateId}, ${input.jobId ?? null}, ${input.eventType}, ${
      input.metadata ? JSON.stringify(input.metadata) : null
    }::jsonb, NOW())
      RETURNING "id", "candidateId", "jobId", "eventType", "createdAt"
    `;

    return rows[0];
  }

  async getCandidatesForRecruiter(limit: number) {
    // Single relational query replaces 2 separate queries (N+1 fix)
    const candidates = await prisma.candidate.findMany({
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        experience: true,
        skills: true,
        skillRecords: { select: { name: true } },
        profile: { select: { id: true } },
      },
    });

    return candidates.map((candidate): CandidateForRecruiter => {
      const skills = new Set<string>([
        ...(candidate.skills ?? []),
        ...candidate.skillRecords.map((skill) => skill.name),
      ]);

      return {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        location: candidate.location,
        experience: candidate.experience ?? 0,
        skills: Array.from(skills),
        profileId: candidate.profile?.id ?? null,
      };
    });
  }

  async getJobById(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            name: true,
            industry: true,
          },
        },
      },
    });
  }

  async getPrecomputedRecommendations(profileId: string, limit: number, cursor?: { matchScore: number; id: string }) {
    return prisma.jobRecommendation.findMany({
      where: {
        profileId,
        job: { status: "ACTIVE" },
        ...(cursor
          ? {
              OR: [
                { matchScore: { lt: cursor.matchScore } },
                { AND: [{ matchScore: cursor.matchScore }, { id: { lt: cursor.id } }] },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        jobId: true,
        matchScore: true,
        skillMatch: true,
        experienceMatch: true,
        locationMatch: true,
        semanticScore: true,
        readinessScore: true,
        missingSkills: true,
        reasons: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            createdAt: true,
            company: { select: { id: true, name: true, industry: true } },
            _count: { select: { applications: true } },
          },
        },
      },
      orderBy: [{ matchScore: "desc" }, { id: "desc" }],
      take: limit,
    });
  }

  async getMarketIntelligence() {
    const cacheKey = "market-intelligence";
    const cached = await cacheGet<{
      trendingSkills: Array<{ skill: string; demandCount: number }>;
      highDemandRoles: Array<{ role: string; demandCount: number }>;
      topHiringCompanies: Array<{ companyName: string; activeJobs: number }>;
    }>(cacheKey);
    if (cached) return cached;

    const [trendingSkills, highDemandRoles, topHiringCompanies] = await Promise.all([
      prisma.$queryRaw<Array<{ skill: string; demandCount: number }>>`
        SELECT skill, COUNT(*)::int as "demandCount"
        FROM (
          SELECT UNNEST("requiredSkills") as skill
          FROM "Job"
          WHERE "status" = 'ACTIVE'
        ) skills
        GROUP BY skill
        ORDER BY "demandCount" DESC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ role: string; demandCount: number }>>`
        SELECT "title" as role, COUNT(*)::int as "demandCount"
        FROM "Job"
        WHERE "status" = 'ACTIVE'
        GROUP BY "title"
        ORDER BY "demandCount" DESC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ companyName: string; activeJobs: number }>>`
        SELECT c."name" as "companyName", COUNT(j."id")::int as "activeJobs"
        FROM "Company" c
        JOIN "Job" j ON j."companyId" = c."id"
        WHERE j."status" = 'ACTIVE'
        GROUP BY c."name"
        ORDER BY "activeJobs" DESC
        LIMIT 10
      `,
    ]);

    const result = {
      trendingSkills,
      highDemandRoles,
      topHiringCompanies,
    };

    await cacheSet(cacheKey, result, 3600); // 60min TTL
    return result;
  }
}
