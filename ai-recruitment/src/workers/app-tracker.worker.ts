import { Worker, type Job } from "bullmq";
import { getWorkerConnection } from "@/lib/bullmq";
import { QUEUE_NAMES } from "@/lib/queues";
import {
  refreshApplicationScores,
  getCandidateDashboardAnalytics,
  getSmartReminders,
} from "@/services/applications/application.service";
import { RecommendationRepository } from "@/repositories/recommendations/recommendation.repository";
import { CacheService } from "@/lib/cache-utils";

const recommendationRepo = new RecommendationRepository();

type CandidatePayload = { candidateId: string };

type SendReminderPayload = {
  candidateId: string;
  type: string;
  message: string;
  applicationId?: string;
};

async function processScoreRefresh(payload: CandidatePayload): Promise<void> {
  await refreshApplicationScores(payload.candidateId);
}

async function processAnalyticsUpdate(payload: CandidatePayload): Promise<void> {
  await getCandidateDashboardAnalytics(payload.candidateId);
}

async function processSendReminder(payload: SendReminderPayload): Promise<void> {
  await getSmartReminders(payload.candidateId);
}

async function processRefreshRecommendationCache(payload: CandidatePayload): Promise<void> {
  await Promise.all([
    CacheService.invalidateRecommendations(payload.candidateId),
    CacheService.del(`candidate-context:${payload.candidateId}`),
  ]);
}

async function processComputeBehaviorSignals(payload: CandidatePayload): Promise<void> {
  const summary = await recommendationRepo.getBehaviorSummary(payload.candidateId, 90);
  await CacheService.set(`behavior-signals:${payload.candidateId}`, summary, 1800);
}

export async function startAppTrackerWorker(): Promise<Worker> {
  const worker = new Worker(
    QUEUE_NAMES.APP_TRACKER,
    async (job: Job) => {
      if (job.name === "refresh-app-scores") {
        await processScoreRefresh(job.data as CandidatePayload);
        return;
      }
      if (job.name === "update-analytics") {
        await processAnalyticsUpdate(job.data as CandidatePayload);
        return;
      }
      if (job.name === "send-reminder") {
        await processSendReminder(job.data as SendReminderPayload);
        return;
      }
      if (job.name === "refresh-recommendation-cache") {
        await processRefreshRecommendationCache(job.data as CandidatePayload);
        return;
      }
      if (job.name === "compute-behavior-signals") {
        await processComputeBehaviorSignals(job.data as CandidatePayload);
      }
    },
    {
      connection: getWorkerConnection(),
      concurrency: Number(process.env.APP_TRACKER_WORKER_CONCURRENCY ?? 5),
    }
  );

  worker.on("failed", (job, error) => {
    console.error("[WORKER][APP_TRACKER][FAILED]", job?.id, error);
  });

  worker.on("completed", (job) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[WORKER][APP_TRACKER][DONE]", job.id, job.name);
    }
  });

  console.log("[WORKER][APP_TRACKER] listening on", QUEUE_NAMES.APP_TRACKER);
  return worker;
}

startAppTrackerWorker().catch((e) => {
  console.error("[WORKER][APP_TRACKER] bootstrap failed:", e);
  process.exit(1);
});
