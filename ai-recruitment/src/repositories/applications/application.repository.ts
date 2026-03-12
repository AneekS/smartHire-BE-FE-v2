import { prisma } from "@/lib/db";
import type { ApplicationStatus, RecruiterActivityType, Prisma } from "@prisma/client";
import { safeQuery } from "@/lib/errors";

// ─── Select constants ────────────────────────────────────────────────────

const APPLICATION_LIST_SELECT = {
  id: true,
  jobId: true,
  candidateId: true,
  status: true,
  aiScore: true,
  interviewProbability: true,
  applicationHealthScore: true,
  readinessScore: true,
  createdAt: true,
  updatedAt: true,
  job: {
    select: {
      id: true,
      title: true,
      location: true,
      type: true,
      workMode: true,
      salary: true,
      salaryMin: true,
      salaryMax: true,
      requiredSkills: true,
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          industry: true,
        },
      },
    },
  },
} as const;

const APPLICATION_DETAIL_SELECT = {
  ...APPLICATION_LIST_SELECT,
  aiNotes: true,
  statusHistory: {
    select: {
      id: true,
      status: true,
      updatedBy: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  recruiterActivities: {
    select: {
      id: true,
      activityType: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 50,
  },
  assessments: {
    select: {
      id: true,
      title: true,
      type: true,
      score: true,
      maxScore: true,
      deadline: true,
      status: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  notes: {
    select: {
      id: true,
      content: true,
      authorId: true,
      authorRole: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 50,
  },
  offer: {
    select: {
      id: true,
      salary: true,
      currency: true,
      benefits: true,
      startDate: true,
      expiresAt: true,
      status: true,
      createdAt: true,
    },
  },
  interview: {
    select: {
      id: true,
      scheduledAt: true,
      type: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

// ─── Repository ──────────────────────────────────────────────────────────

export async function findApplicationsByCandidate(
  candidateId: string,
  options: {
    status?: ApplicationStatus;
    cursor?: string;
    limit?: number;
  } = {}
) {
  const { status, cursor, limit = 20 } = options;

  const where: Record<string, unknown> = { candidateId };
  if (status) where.status = status;

  return safeQuery(
    () =>
      prisma.application.findMany({
        where,
        select: APPLICATION_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    "Application"
  );
}

export async function findApplicationById(id: string) {
  return safeQuery(
    () =>
      prisma.application.findUnique({
        where: { id },
        select: APPLICATION_DETAIL_SELECT,
      }),
    "Application"
  );
}

export async function findApplicationByJobAndCandidate(
  jobId: string,
  candidateId: string
) {
  return prisma.application.findUnique({
    where: { jobId_candidateId: { jobId, candidateId } },
    select: { id: true, status: true },
  });
}

export async function createApplication(data: {
  jobId: string;
  candidateId: string;
  aiNotes?: string;
  aiScore?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        jobId: data.jobId,
        candidateId: data.candidateId,
        status: "APPLIED",
        aiScore: data.aiScore,
        aiNotes: data.aiNotes,
      },
      select: APPLICATION_LIST_SELECT,
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        status: "APPLIED",
      },
    });

    // Upsert analytics counter
    await tx.$executeRaw`
      INSERT INTO "CandidateAnalytics" ("id", "candidateId", "applicationsSent", "lastUpdatedAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${data.candidateId}, 1, NOW(), NOW(), NOW())
      ON CONFLICT ("candidateId")
      DO UPDATE SET "applicationsSent" = "CandidateAnalytics"."applicationsSent" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()
    `;

    return application;
  });
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  updatedBy?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.application.update({
      where: { id },
      data: { status },
      select: APPLICATION_DETAIL_SELECT,
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: id,
        status,
        updatedBy,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    return application;
  });
}

export async function addApplicationNote(
  applicationId: string,
  content: string,
  authorId: string,
  authorRole: string
) {
  return prisma.applicationNote.create({
    data: {
      applicationId,
      content,
      authorId,
      authorRole,
    },
    select: {
      id: true,
      content: true,
      authorId: true,
      authorRole: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createRecruiterActivity(
  applicationId: string,
  activityType: RecruiterActivityType,
  metadata?: Record<string, unknown>
) {
  return prisma.recruiterActivity.create({
    data: {
      applicationId,
      activityType,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getRecruiterActivities(
  applicationId: string,
  limit = 50
) {
  return prisma.recruiterActivity.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getApplicationTimeline(applicationId: string) {
  return prisma.applicationStatusHistory.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      updatedBy: true,
      metadata: true,
      createdAt: true,
    },
  });
}

export async function getCandidateAnalytics(candidateId: string) {
  return safeQuery(
    () =>
      prisma.candidateAnalytics.findUnique({
        where: { candidateId },
      }),
    "CandidateAnalytics"
  );
}

export async function upsertCandidateAnalytics(
  candidateId: string,
  data: {
    applicationsSent?: number;
    resumeViewed?: number;
    shortlistedCount?: number;
    interviewCount?: number;
    offerCount?: number;
    hiredCount?: number;
    rejectedCount?: number;
    withdrawnCount?: number;
    avgHealthScore?: number;
  }
) {
  return prisma.$executeRaw`
    INSERT INTO "CandidateAnalytics" ("id", "candidateId", "applicationsSent", "resumeViewed", "shortlistedCount", "interviewCount", "offerCount", "hiredCount", "rejectedCount", "withdrawnCount", "avgHealthScore", "lastUpdatedAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${candidateId}, ${data.applicationsSent ?? 0}, ${data.resumeViewed ?? 0}, ${data.shortlistedCount ?? 0}, ${data.interviewCount ?? 0}, ${data.offerCount ?? 0}, ${data.hiredCount ?? 0}, ${data.rejectedCount ?? 0}, ${data.withdrawnCount ?? 0}, ${data.avgHealthScore ?? 0}, NOW(), NOW(), NOW())
    ON CONFLICT ("candidateId")
    DO UPDATE SET
      "applicationsSent" = COALESCE(${data.applicationsSent ?? null}::int, "CandidateAnalytics"."applicationsSent"),
      "resumeViewed" = COALESCE(${data.resumeViewed ?? null}::int, "CandidateAnalytics"."resumeViewed"),
      "shortlistedCount" = COALESCE(${data.shortlistedCount ?? null}::int, "CandidateAnalytics"."shortlistedCount"),
      "interviewCount" = COALESCE(${data.interviewCount ?? null}::int, "CandidateAnalytics"."interviewCount"),
      "offerCount" = COALESCE(${data.offerCount ?? null}::int, "CandidateAnalytics"."offerCount"),
      "hiredCount" = COALESCE(${data.hiredCount ?? null}::int, "CandidateAnalytics"."hiredCount"),
      "rejectedCount" = COALESCE(${data.rejectedCount ?? null}::int, "CandidateAnalytics"."rejectedCount"),
      "withdrawnCount" = COALESCE(${data.withdrawnCount ?? null}::int, "CandidateAnalytics"."withdrawnCount"),
      "avgHealthScore" = COALESCE(${data.avgHealthScore ?? null}::double precision, "CandidateAnalytics"."avgHealthScore"),
      "lastUpdatedAt" = NOW(),
      "updatedAt" = NOW()
  `;
}

export async function getApplicationCountsByStatus(candidateId: string) {
  const result = await prisma.application.groupBy({
    by: ["status"],
    where: { candidateId },
    _count: { id: true },
  });
  return result.reduce(
    (acc, row) => {
      acc[row.status] = row._count.id;
      return acc;
    },
    {} as Record<string, number>
  );
}

export async function updateApplicationScores(
  id: string,
  scores: {
    interviewProbability?: number;
    applicationHealthScore?: number;
    readinessScore?: number;
  }
) {
  return prisma.application.update({
    where: { id },
    data: scores,
    select: { id: true },
  });
}

export async function getApplicationsForScoreUpdate(candidateId: string) {
  return prisma.application.findMany({
    where: {
      candidateId,
      status: {
        notIn: ["REJECTED", "WITHDRAWN", "HIRED"],
      },
    },
    select: {
      id: true,
      jobId: true,
      candidateId: true,
      status: true,
      aiScore: true,
      createdAt: true,
      recruiterActivities: {
        select: { activityType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      job: {
        select: {
          requiredSkills: true,
          company: { select: { id: true } },
        },
      },
    },
  });
}
