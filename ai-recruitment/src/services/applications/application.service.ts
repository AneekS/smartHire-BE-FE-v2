import type { ApplicationStatus, RecruiterActivityType } from "@prisma/client";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";
import { NotFoundError, ValidationError, AppError } from "@/lib/errors";
import {
  findApplicationsByCandidate,
  findApplicationById,
  findApplicationByJobAndCandidate,
  createApplication,
  updateApplicationStatus,
  addApplicationNote,
  createRecruiterActivity,
  getApplicationTimeline,
  getCandidateAnalytics,
  getApplicationCountsByStatus,
  updateApplicationScores,
  getApplicationsForScoreUpdate,
  upsertCandidateAnalytics,
} from "@/repositories/applications/application.repository";
import { prisma } from "@/lib/db";

// ─── Constants ───────────────────────────────────────────────────────────

const CACHE_TTL = 300; // 5 minutes
const ANALYTICS_CACHE_TTL = 600; // 10 minutes

const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "RESUME_VIEWED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "OFFER",
  "HIRED",
];

const VALID_TRANSITIONS: Record<string, ApplicationStatus[]> = {
  APPLIED: ["RESUME_VIEWED", "UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  RESUME_VIEWED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["INTERVIEW_SCHEDULED", "REJECTED", "WITHDRAWN"],
  INTERVIEW_SCHEDULED: ["INTERVIEW_COMPLETED", "REJECTED", "WITHDRAWN"],
  INTERVIEW_COMPLETED: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["HIRED", "REJECTED", "WITHDRAWN"],
  REJECTED: [],
  HIRED: [],
  WITHDRAWN: [],
};

// ─── Application CRUD ────────────────────────────────────────────────────

export async function applyToJob(
  candidateId: string,
  jobId: string,
  coverNote?: string
) {
  const existing = await findApplicationByJobAndCandidate(jobId, candidateId);
  if (existing) {
    throw new AppError("Already applied to this job", 409, "DUPLICATE_APPLICATION");
  }

  // Snapshot candidate profile for the application
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      name: true,
      email: true,
      headline: true,
      summary: true,
      location: true,
      resumeUrl: true,
      skills: true,
      profileCompleteness: true,
    },
  });

  if (!candidate) {
    throw new NotFoundError("Candidate");
  }

  const profileSnapshot = {
    resumeUrl: candidate.resumeUrl,
    profile: {
      name: candidate.name,
      email: candidate.email,
      headline: candidate.headline,
      summary: candidate.summary,
      location: candidate.location,
    },
    skills: candidate.skills ?? [],
    coverNote: coverNote ?? null,
    submittedAt: new Date().toISOString(),
  };

  const application = await createApplication({
    jobId,
    candidateId,
    aiNotes: JSON.stringify(profileSnapshot),
  });

  // Invalidate caches
  await cacheDelete(`apps:candidate:${candidateId}`);
  await cacheDelete(`analytics:${candidateId}`);

  return application;
}

export async function getCandidateApplications(
  candidateId: string,
  options: {
    status?: ApplicationStatus;
    cursor?: string;
    limit?: number;
  } = {}
) {
  const { limit = 20 } = options;

  // Only cache first page with no filters
  const cacheKey = !options.status && !options.cursor
    ? `apps:candidate:${candidateId}`
    : null;

  if (cacheKey) {
    const cached = await cacheGet<{ applications: unknown[]; nextCursor: string | null }>(cacheKey);
    if (cached) return cached;
  }

  const rows = await findApplicationsByCandidate(candidateId, options);
  const hasMore = rows.length > limit;
  const applications = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? applications[applications.length - 1].id : null;

  const result = { applications, nextCursor };

  if (cacheKey) {
    await cacheSet(cacheKey, result, CACHE_TTL);
  }

  return result;
}

export async function getApplicationDetail(
  applicationId: string,
  candidateId: string
) {
  const cacheKey = `app:detail:${applicationId}`;
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const application = await findApplicationById(applicationId);
  if (!application) {
    throw new NotFoundError("Application");
  }

  if (application.candidateId !== candidateId) {
    throw new NotFoundError("Application");
  }

  const result = {
    ...application,
    timeline: application.statusHistory,
  };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

export async function changeApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  updatedBy: string,
  metadata?: Record<string, unknown>
) {
  const application = await findApplicationById(applicationId);
  if (!application) {
    throw new NotFoundError("Application");
  }

  const currentStatus = application.status;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }

  const updated = await updateApplicationStatus(
    applicationId,
    newStatus,
    updatedBy,
    metadata
  );

  // Update analytics counters based on status
  await updateAnalyticsForStatusChange(application.candidateId, newStatus);

  // Invalidate caches
  await Promise.all([
    cacheDelete(`app:detail:${applicationId}`),
    cacheDelete(`apps:candidate:${application.candidateId}`),
    cacheDelete(`analytics:${application.candidateId}`),
  ]);

  return updated;
}

export async function withdrawApplication(
  applicationId: string,
  candidateId: string
) {
  const application = await findApplicationById(applicationId);
  if (!application) {
    throw new NotFoundError("Application");
  }
  if (application.candidateId !== candidateId) {
    throw new NotFoundError("Application");
  }

  const terminalStatuses: ApplicationStatus[] = ["REJECTED", "HIRED", "WITHDRAWN"];
  if (terminalStatuses.includes(application.status)) {
    throw new ValidationError(
      `Cannot withdraw application in ${application.status} status`
    );
  }

  const updated = await updateApplicationStatus(
    applicationId,
    "WITHDRAWN",
    candidateId
  );

  await updateAnalyticsForStatusChange(candidateId, "WITHDRAWN");

  await Promise.all([
    cacheDelete(`app:detail:${applicationId}`),
    cacheDelete(`apps:candidate:${candidateId}`),
    cacheDelete(`analytics:${candidateId}`),
  ]);

  return updated;
}

export async function addNote(
  applicationId: string,
  candidateId: string,
  content: string,
  authorRole: string = "CANDIDATE"
) {
  const application = await findApplicationById(applicationId);
  if (!application) {
    throw new NotFoundError("Application");
  }
  if (authorRole === "CANDIDATE" && application.candidateId !== candidateId) {
    throw new NotFoundError("Application");
  }

  const note = await addApplicationNote(applicationId, content, candidateId, authorRole);

  await cacheDelete(`app:detail:${applicationId}`);
  return note;
}

// ─── Recruiter Activity ──────────────────────────────────────────────────

export async function trackRecruiterActivity(
  applicationId: string,
  activityType: RecruiterActivityType,
  metadata?: Record<string, unknown>
) {
  const activity = await createRecruiterActivity(applicationId, activityType, metadata);

  // Auto-transition status for certain activities
  const application = await findApplicationById(applicationId);
  if (application) {
    const statusMap: Partial<Record<RecruiterActivityType, ApplicationStatus>> = {
      RESUME_VIEWED: "RESUME_VIEWED",
      SHORTLISTED: "SHORTLISTED",
      INTERVIEW_SCHEDULED: "INTERVIEW_SCHEDULED",
    };

    const targetStatus = statusMap[activityType];
    if (targetStatus) {
      const current = application.status;
      const allowed = VALID_TRANSITIONS[current] ?? [];
      if (allowed.includes(targetStatus)) {
        await updateApplicationStatus(applicationId, targetStatus, "SYSTEM");
      }
    }

    // Update analytics for recruiter views
    if (activityType === "RESUME_VIEWED") {
      await updateAnalyticsForStatusChange(application.candidateId, "RESUME_VIEWED");
    }

    await Promise.all([
      cacheDelete(`app:detail:${applicationId}`),
      cacheDelete(`apps:candidate:${application.candidateId}`),
    ]);
  }

  return activity;
}

// ─── Analytics ───────────────────────────────────────────────────────────

export async function getCandidateDashboardAnalytics(candidateId: string) {
  const cacheKey = `analytics:${candidateId}`;
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const [analytics, statusCounts] = await Promise.all([
    getCandidateAnalytics(candidateId),
    getApplicationCountsByStatus(candidateId),
  ]);

  const result = {
    applicationsSent: analytics?.applicationsSent ?? statusCounts.APPLIED ?? 0,
    resumeViewed: analytics?.resumeViewed ?? statusCounts.RESUME_VIEWED ?? 0,
    shortlistedCount: analytics?.shortlistedCount ?? statusCounts.SHORTLISTED ?? 0,
    interviewCount: analytics?.interviewCount ?? statusCounts.INTERVIEW_SCHEDULED ?? 0,
    offerCount: analytics?.offerCount ?? statusCounts.OFFER ?? 0,
    hiredCount: analytics?.hiredCount ?? statusCounts.HIRED ?? 0,
    rejectedCount: analytics?.rejectedCount ?? statusCounts.REJECTED ?? 0,
    withdrawnCount: analytics?.withdrawnCount ?? statusCounts.WITHDRAWN ?? 0,
    avgHealthScore: analytics?.avgHealthScore ?? 0,
    statusBreakdown: statusCounts,
    totalActive: Object.entries(statusCounts)
      .filter(([s]) => !["REJECTED", "WITHDRAWN", "HIRED"].includes(s))
      .reduce((sum, [, count]) => sum + count, 0),
  };

  await cacheSet(cacheKey, result, ANALYTICS_CACHE_TTL);
  return result;
}

// ─── Health Score Calculation ────────────────────────────────────────────

/**
 * Calculate health score for a single application.
 * Accepts pre-fetched candidate data to avoid N+1 queries in batch operations.
 */
export function calculateHealthScoreFromData(
  application: {
    aiScore: number | null;
    recruiterActivities?: { activityType: string; createdAt: Date }[];
    job: { requiredSkills: string[] };
  },
  candidate: { skills: string[]; profileCompleteness: number } | null
): number {
  const atsScore = application.aiScore ?? 50;

  const candidateSkills = (candidate?.skills ?? []).map((s) => s.toLowerCase());
  const requiredSkills = (application.job.requiredSkills ?? []).map((s) => s.toLowerCase());
  const matchedSkills = requiredSkills.filter((s) => candidateSkills.includes(s));
  const skillMatch = requiredSkills.length > 0
    ? (matchedSkills.length / requiredSkills.length) * 100
    : 50;

  const activityCount = application.recruiterActivities?.length ?? 0;
  const recruiterActivityScore = Math.min(activityCount * 20, 100);
  const resumeCompleteness = candidate?.profileCompleteness ?? 50;

  const healthScore =
    0.4 * atsScore +
    0.3 * skillMatch +
    0.2 * recruiterActivityScore +
    0.1 * resumeCompleteness;

  return Math.round(Math.min(100, Math.max(0, healthScore)));
}

export async function calculateHealthScore(applicationId: string): Promise<number> {
  const application = await findApplicationById(applicationId);
  if (!application) return 0;

  const candidate = await prisma.candidate.findUnique({
    where: { id: application.candidateId },
    select: { skills: true, profileCompleteness: true },
  });

  return calculateHealthScoreFromData(application, candidate);
}

/**
 * Calculate interview probability for a single application.
 * Accepts pre-fetched candidate data to avoid N+1 queries in batch operations.
 */
export function calculateInterviewProbabilityFromData(
  application: {
    status: ApplicationStatus;
    aiScore: number | null;
    recruiterActivities?: { activityType: string; createdAt: Date }[];
    job: { requiredSkills: string[] };
  },
  candidate: { skills: string[]; aiScore: number | null } | null
): number {
  const atsScore = application.aiScore ?? candidate?.aiScore ?? 50;
  const candidateSkills = (candidate?.skills ?? []).map((s) => s.toLowerCase());
  const requiredSkills = (application.job.requiredSkills ?? []).map((s) => s.toLowerCase());
  const matchedSkills = requiredSkills.filter((s) => candidateSkills.includes(s));
  const skillMatch = requiredSkills.length > 0
    ? (matchedSkills.length / requiredSkills.length) * 100
    : 50;

  const activityCount = application.recruiterActivities?.length ?? 0;
  const recruiterEngagement = Math.min(activityCount * 25, 100);

  const statusIndex = STATUS_ORDER.indexOf(application.status);
  const progressionBonus = statusIndex >= 0 ? statusIndex * 10 : 0;

  const probability =
    0.3 * atsScore +
    0.3 * skillMatch +
    0.2 * recruiterEngagement +
    0.2 * progressionBonus;

  return Math.round(Math.min(100, Math.max(0, probability)));
}

export async function calculateInterviewProbability(applicationId: string): Promise<number> {
  const application = await findApplicationById(applicationId);
  if (!application) return 0;

  const candidate = await prisma.candidate.findUnique({
    where: { id: application.candidateId },
    select: { skills: true, aiScore: true },
  });

  return calculateInterviewProbabilityFromData(application, candidate);
}

// ─── Score Refresh (batch) ───────────────────────────────────────────────

export async function refreshApplicationScores(candidateId: string) {
  const applications = await getApplicationsForScoreUpdate(candidateId);
  if (applications.length === 0) return [];

  // Batch-fetch candidate data once instead of per-application (N+1 fix)
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { skills: true, aiScore: true, profileCompleteness: true },
  });

  const updates = applications.map((app) => {
    const healthScore = calculateHealthScoreFromData(app, candidate);
    const interviewProbability = calculateInterviewProbabilityFromData(app, candidate);
    return { id: app.id, healthScore, interviewProbability };
  });

  // Batch update all scores in a single transaction
  await prisma.$transaction(
    updates.map((u) =>
      prisma.application.update({
        where: { id: u.id },
        data: {
          applicationHealthScore: u.healthScore,
          interviewProbability: u.interviewProbability,
        },
        select: { id: true },
      })
    )
  );

  // Update average health score in analytics
  if (updates.length > 0) {
    const avgHealth =
      updates.reduce((sum, u) => sum + u.healthScore, 0) / updates.length;
    await upsertCandidateAnalytics(candidateId, { avgHealthScore: avgHealth });
  }

  await Promise.all([
    cacheDelete(`apps:candidate:${candidateId}`),
    cacheDelete(`analytics:${candidateId}`),
  ]);

  return updates;
}

// ─── Reminders ───────────────────────────────────────────────────────────

export async function getSmartReminders(candidateId: string) {
  const reminders: Array<{
    type: string;
    message: string;
    priority: "high" | "medium" | "low";
    applicationId?: string;
    dueDate?: string;
  }> = [];

  const applications = await prisma.application.findMany({
    where: {
      candidateId,
      status: { notIn: ["REJECTED", "WITHDRAWN", "HIRED"] },
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      job: { select: { title: true, company: { select: { name: true } } } },
      interview: { select: { scheduledAt: true, status: true } },
      assessments: {
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
        select: { title: true, deadline: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const threeDaysMs = 3 * oneDayMs;

  for (const app of applications) {
    // Interview tomorrow
    if (app.interview?.scheduledAt && app.interview.status === "SCHEDULED") {
      const interviewTime = new Date(app.interview.scheduledAt).getTime();
      const diff = interviewTime - now.getTime();
      if (diff > 0 && diff < oneDayMs) {
        reminders.push({
          type: "INTERVIEW_TOMORROW",
          message: `Interview for ${app.job.title} at ${app.job.company.name} is tomorrow`,
          priority: "high",
          applicationId: app.id,
          dueDate: app.interview.scheduledAt.toISOString(),
        });
      } else if (diff > 0 && diff < threeDaysMs) {
        reminders.push({
          type: "INTERVIEW_UPCOMING",
          message: `Upcoming interview for ${app.job.title} at ${app.job.company.name}`,
          priority: "medium",
          applicationId: app.id,
          dueDate: app.interview.scheduledAt.toISOString(),
        });
      }
    }

    // Assessment deadlines
    for (const assessment of app.assessments) {
      if (assessment.deadline) {
        const deadline = new Date(assessment.deadline).getTime();
        const diff = deadline - now.getTime();
        if (diff > 0 && diff < oneDayMs) {
          reminders.push({
            type: "ASSESSMENT_DUE_SOON",
            message: `Assessment "${assessment.title}" for ${app.job.title} is due tomorrow`,
            priority: "high",
            applicationId: app.id,
            dueDate: assessment.deadline.toISOString(),
          });
        } else if (diff > 0 && diff < threeDaysMs) {
          reminders.push({
            type: "ASSESSMENT_UPCOMING",
            message: `Assessment "${assessment.title}" deadline approaching`,
            priority: "medium",
            applicationId: app.id,
            dueDate: assessment.deadline.toISOString(),
          });
        }
      }
    }

    // Follow-up suggestion (no activity for 7+ days)
    const daysSinceUpdate = (now.getTime() - new Date(app.updatedAt).getTime()) / oneDayMs;
    if (daysSinceUpdate > 7 && app.status !== "OFFER") {
      reminders.push({
        type: "FOLLOW_UP",
        message: `No activity on ${app.job.title} application for ${Math.floor(daysSinceUpdate)} days. Consider following up.`,
        priority: "low",
        applicationId: app.id,
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  reminders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return reminders;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function updateAnalyticsForStatusChange(
  candidateId: string,
  newStatus: ApplicationStatus
) {
  // Use explicit branches to avoid $executeRawUnsafe with dynamic column names
  switch (newStatus) {
    case "RESUME_VIEWED":
      await prisma.$executeRaw`
        INSERT INTO "CandidateAnalytics" ("id", "candidateId", "resumeViewed", "lastUpdatedAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${candidateId}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("candidateId")
        DO UPDATE SET "resumeViewed" = "CandidateAnalytics"."resumeViewed" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()`;
      break;
    case "SHORTLISTED":
      await prisma.$executeRaw`
        INSERT INTO "CandidateAnalytics" ("id", "candidateId", "shortlistedCount", "lastUpdatedAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${candidateId}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("candidateId")
        DO UPDATE SET "shortlistedCount" = "CandidateAnalytics"."shortlistedCount" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()`;
      break;
    case "INTERVIEW_SCHEDULED":
      await prisma.$executeRaw`
        INSERT INTO "CandidateAnalytics" ("id", "candidateId", "interviewCount", "lastUpdatedAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${candidateId}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("candidateId")
        DO UPDATE SET "interviewCount" = "CandidateAnalytics"."interviewCount" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()`;
      break;
    case "OFFER":
      await prisma.$executeRaw`
        INSERT INTO "CandidateAnalytics" ("id", "candidateId", "offerCount", "lastUpdatedAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${candidateId}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("candidateId")
        DO UPDATE SET "offerCount" = "CandidateAnalytics"."offerCount" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()`;
      break;
    case "HIRED":
      await prisma.$executeRaw`
        INSERT INTO "CandidateAnalytics" ("id", "candidateId", "hiredCount", "lastUpdatedAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${candidateId}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("candidateId")
        DO UPDATE SET "hiredCount" = "CandidateAnalytics"."hiredCount" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()`;
      break;
    case "REJECTED":
      await prisma.$executeRaw`
        INSERT INTO "CandidateAnalytics" ("id", "candidateId", "rejectedCount", "lastUpdatedAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${candidateId}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("candidateId")
        DO UPDATE SET "rejectedCount" = "CandidateAnalytics"."rejectedCount" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()`;
      break;
    case "WITHDRAWN":
      await prisma.$executeRaw`
        INSERT INTO "CandidateAnalytics" ("id", "candidateId", "withdrawnCount", "lastUpdatedAt", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${candidateId}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("candidateId")
        DO UPDATE SET "withdrawnCount" = "CandidateAnalytics"."withdrawnCount" + 1, "lastUpdatedAt" = NOW(), "updatedAt" = NOW()`;
      break;
    default:
      // No analytics update needed for other statuses
      break;
  }
}
