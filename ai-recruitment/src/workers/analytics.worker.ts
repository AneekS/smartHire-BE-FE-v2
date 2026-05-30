import { Worker, type Job } from "bullmq";
import { getWorkerConnection } from "@/lib/bullmq";
import { QUEUE_NAMES } from "@/lib/queues";
import { MetricsCollector } from "@/monitoring/metrics";
import { prisma } from "@/lib/prisma";
import { CacheService } from "@/lib/cache-utils";

type DailyMetricPayload = { date?: string; tenantId?: string };
type CandidateAnalyticsPayload = { candidateId: string };

export async function aggregateDailyMetrics(date: Date = new Date()): Promise<void> {
  await MetricsCollector.computeDaily(date);
  await MetricsCollector.sampleQueueDepth();
  console.log("[WORKER][ANALYTICS] DailyMetric aggregation complete for", date.toISOString());
}

async function aggregateCandidateAnalytics(candidateId: string): Promise<void> {
  const applications = await prisma.application.findMany({
    where: { candidateId },
    select: {
      status: true,
      applicationHealthScore: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!applications.length) return;

  const counts = {
    applicationsSent: applications.length,
    shortlistedCount: 0,
    interviewCount: 0,
    offerCount: 0,
    hiredCount: 0,
    rejectedCount: 0,
    withdrawnCount: 0,
  };

  let totalHealthScore = 0;
  let healthScoreCount = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;

  for (const app of applications) {
    switch (app.status) {
      case "SHORTLISTED":
        counts.shortlistedCount++;
        break;
      case "INTERVIEW_SCHEDULED":
      case "INTERVIEW_COMPLETED":
        counts.interviewCount++;
        break;
      case "OFFER":
        counts.offerCount++;
        break;
      case "HIRED":
        counts.hiredCount++;
        break;
      case "REJECTED":
        counts.rejectedCount++;
        break;
      case "WITHDRAWN":
        counts.withdrawnCount++;
        break;
    }

    if (app.applicationHealthScore != null) {
      totalHealthScore += app.applicationHealthScore;
      healthScoreCount++;
    }

    if (app.status !== "APPLIED" && app.status !== "WITHDRAWN") {
      totalResponseTime += app.updatedAt.getTime() - app.createdAt.getTime();
      responseTimeCount++;
    }
  }

  const avgHealthScore =
    healthScoreCount > 0 ? Math.round((totalHealthScore / healthScoreCount) * 100) / 100 : 0;
  const avgResponseTime =
    responseTimeCount > 0
      ? Math.round((totalResponseTime / responseTimeCount / (1000 * 60 * 60)) * 10) / 10
      : null;

  await prisma.candidateAnalytics.upsert({
    where: { candidateId },
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
}

export async function startAnalyticsWorker(): Promise<Worker> {
  const worker = new Worker(
    QUEUE_NAMES.ANALYTICS,
    async (job: Job) => {
      if (job.name === "aggregate-daily-metrics") {
        const data = job.data as DailyMetricPayload;
        const date = data.date ? new Date(data.date) : new Date();
        await aggregateDailyMetrics(date);
        return;
      }

      if (job.name === "aggregate-candidate-analytics") {
        await aggregateCandidateAnalytics((job.data as CandidateAnalyticsPayload).candidateId);
      }
    },
    {
      connection: getWorkerConnection(),
      concurrency: Number(process.env.ANALYTICS_WORKER_CONCURRENCY ?? 5),
    }
  );

  worker.on("failed", (job, error) => {
    console.error("[WORKER][ANALYTICS][FAILED]", job?.id, error.message);
  });

  worker.on("completed", (job) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[WORKER][ANALYTICS][DONE]", job.id, job.name);
    }
  });

  console.log("[WORKER][ANALYTICS] Started");
  return worker;
}

startAnalyticsWorker().catch((e) => {
  console.error("[WORKER][ANALYTICS] bootstrap failed:", e);
  process.exit(1);
});
