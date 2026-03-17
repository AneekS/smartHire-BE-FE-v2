import { prisma } from "@/lib/db";
import { publishNotificationEvent } from "@/modules/notifications/events/notification.events";

export async function notifyJobMatchesPreference(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      salaryMin: true,
      salaryMax: true,
      company: { select: { name: true } },
    },
  });

  if (!job) return;

  const matchingPreferences = await prisma.userPreference.findMany({
    where: {
      AND: [
        {
          OR: [
            { primaryRole: { contains: job.title, mode: "insensitive" } },
            { secondaryRoles: { has: job.title } },
            { exploratoryRoles: { has: job.title } },
          ],
        },
        ...(job.salaryMin != null && job.salaryMax != null
          ? [
              {
                salaryMin: { lte: job.salaryMax },
                salaryMax: { gte: job.salaryMin },
              },
            ]
          : []),
      ],
    },
    select: {
      userId: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    take: 500,
  });

  await Promise.all(
    matchingPreferences.map((pref) =>
      publishNotificationEvent({
        type: "JOB_MATCH_FOUND",
        userId: pref.userId,
        userEmail: pref.user.email,
        userName: pref.user.name ?? undefined,
        metadata: {
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.company.name,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
        },
      }),
    ),
  );
}

export async function notifyRecruiterViewedCandidate(
  userId: string,
  recruiterName?: string,
  companyName?: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) return;

  await publishNotificationEvent({
    type: "PROFILE_VIEWED",
    userId,
    userEmail: user.email,
    userName: user.name ?? undefined,
    metadata: {
      recruiterName,
      companyName,
    },
  });
}

export async function notifyCandidateShortlisted(applicationId: string): Promise<void> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      candidate: {
        select: {
          userId: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  const userId = application?.candidate.userId;
  if (!application || !userId) return;

  await publishNotificationEvent({
    type: "CANDIDATE_SHORTLISTED",
    userId,
    userEmail: application.candidate.user?.email,
    userName: application.candidate.user?.name ?? undefined,
    metadata: {
      applicationId,
      jobId: application.job.id,
      jobTitle: application.job.title,
      companyName: application.job.company.name,
    },
  });
}
