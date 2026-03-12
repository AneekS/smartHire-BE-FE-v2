import { Worker } from "bullmq";
import { getBullConnectionOptions } from "@/lib/redis-options";
import {
  refreshApplicationScores,
  getCandidateDashboardAnalytics,
  getSmartReminders,
} from "@/services/applications/application.service";
import { RecommendationRepository } from "@/repositories/recommendations/recommendation.repository";
import { CacheService } from "@/lib/cache-utils";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required to run application tracker worker");
}

const recommendationRepo = new RecommendationRepository();

type CandidatePayload = {
  candidateId: string;
};

type SendReminderPayload = {
  candidateId: string;
  type: string;
  message: string;
  applicationId?: string;
};

async function processScoreRefresh(payload: CandidatePayload) {
  await refreshApplicationScores(payload.candidateId);
}

async function processAnalyticsUpdate(payload: CandidatePayload) {
  await getCandidateDashboardAnalytics(payload.candidateId);
}

async function processSendReminder(payload: SendReminderPayload) {
  // Compute and cache reminders for the candidate
  await getSmartReminders(payload.candidateId);
}

async function processRefreshRecommendationCache(payload: CandidatePayload) {
  // Invalidate recommendation caches so next request triggers fresh computation
  await Promise.all([
    CacheService.invalidateRecommendations(payload.candidateId),
    CacheService.del(`candidate-context:${payload.candidateId}`),
  ]);
}

async function processComputeBehaviorSignals(payload: CandidatePayload) {
  const LOOKBACK_DAYS = 90;
  const summary = await recommendationRepo.getBehaviorSummary(payload.candidateId, LOOKBACK_DAYS);
  await CacheService.set(`behavior-signals:${payload.candidateId}`, summary, 1800);
}

async function bootstrap() {
  const workerConnection = getBullConnectionOptions(redisUrl);
  if (!workerConnection) {
    throw new Error("Failed to parse REDIS_URL for application tracker worker");
  }

  const worker = new Worker(
    "recommendation-embedding-jobs",
    async (job) => {
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
        return;
      }

      // Ignore jobs not handled by this worker
    },
    {
      connection: workerConnection,
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
}

void bootstrap();
