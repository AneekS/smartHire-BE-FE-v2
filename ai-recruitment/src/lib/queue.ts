import { getBullConnectionOptions } from "@/lib/redis-options";
import { safeId } from "@/lib/utils/safeId";

export type QueueJobName = "embed-resume" | "embed-job" | "healthcheck" | "refresh-app-scores" | "update-analytics" | "send-reminder" | "precompute-recommendations" | "refresh-recommendation-cache" | "compute-behavior-signals";

type QueuePayloadByName = {
  "embed-resume": {
    candidateId: string;
    resumeText: string;
  };
  "embed-job": {
    jobId: string;
    content: string;
  };
  healthcheck: {
    timestamp: string;
  };
  "refresh-app-scores": {
    candidateId: string;
  };
  "update-analytics": {
    candidateId: string;
  };
  "send-reminder": {
    candidateId: string;
    type: string;
    message: string;
    applicationId?: string;
  };
  "precompute-recommendations": {
    candidateId: string;
    email?: string;
  };
  "refresh-recommendation-cache": {
    candidateId: string;
  };
  "compute-behavior-signals": {
    candidateId: string;
  };
};

type QueueProducer = {
  add: <T extends QueueJobName>(name: T, payload: QueuePayloadByName[T], options?: { jobId?: string }) => Promise<void>;
};

let producerPromise: Promise<QueueProducer> | null = null;

function inMemoryProducer(): QueueProducer {
  return {
    add: async () => {
      // No-op in local mode when queue infra is unavailable.
    },
  };
}

async function createBullProducer(): Promise<QueueProducer> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return inMemoryProducer();

  const { Queue } = await import("bullmq");
  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) return inMemoryProducer();

  const queue = new Queue("recommendation-embedding-jobs", { connection });

  return {
    add: async (name, payload, options) => {
      await queue.add(name, payload, {
        removeOnComplete: 1000,
        removeOnFail: 2000,
        attempts: 4,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        jobId: options?.jobId,
      });
    },
  };
}

export async function getQueueProducer(): Promise<QueueProducer> {
  if (!producerPromise) {
    producerPromise = createBullProducer().catch((error) => {
      console.error("[QUEUE][INIT_FAILED]", error);
      return inMemoryProducer();
    });
  }

  return producerPromise;
}

export async function enqueueEmbeddingResumeJob(payload: QueuePayloadByName["embed-resume"]): Promise<void> {
  const producer = await getQueueProducer();
  await producer.add("embed-resume", payload, {
    jobId: safeId(`resume-${payload.candidateId}`),
  });
}

export async function enqueueEmbeddingJob(payload: QueuePayloadByName["embed-job"]): Promise<void> {
  const producer = await getQueueProducer();
  await producer.add("embed-job", payload, {
    jobId: safeId(`job-${payload.jobId}`),
  });
}

export async function enqueueRefreshAppScores(candidateId: string): Promise<void> {
  const producer = await getQueueProducer();
  await producer.add("refresh-app-scores", { candidateId }, {
    jobId: safeId(`app-scores-${candidateId}`),
  });
}

export async function enqueueUpdateAnalytics(candidateId: string): Promise<void> {
  const producer = await getQueueProducer();
  await producer.add("update-analytics", { candidateId }, {
    jobId: safeId(`analytics-${candidateId}`),
  });
}

export async function enqueuePrecomputeRecommendations(candidateId: string, email?: string): Promise<void> {
  const producer = await getQueueProducer();
  await producer.add("precompute-recommendations", { candidateId, email }, {
    jobId: safeId(`precompute-recs-${candidateId}`),
  });
}

export async function enqueueRefreshRecommendationCache(candidateId: string): Promise<void> {
  const producer = await getQueueProducer();
  await producer.add("refresh-recommendation-cache", { candidateId }, {
    jobId: safeId(`refresh-rec-cache-${candidateId}`),
  });
}

export async function enqueueComputeBehaviorSignals(candidateId: string): Promise<void> {
  const producer = await getQueueProducer();
  await producer.add("compute-behavior-signals", { candidateId }, {
    jobId: safeId(`behavior-signals-${candidateId}`),
  });
}

export async function queueHealth(): Promise<{
  mode: "bullmq" | "memory";
  ready: boolean;
  details?: string;
}> {
  if (!process.env.REDIS_URL) {
    return {
      mode: "memory",
      ready: true,
      details: "REDIS_URL not configured; queue fallback mode",
    };
  }

  try {
    const producer = await getQueueProducer();
    await producer.add(
      "healthcheck",
      { timestamp: new Date().toISOString() },
      { jobId: safeId(`healthcheck-${Date.now()}`) }
    );

    return {
      mode: "bullmq",
      ready: true,
      details: "Queue enqueue check passed",
    };
  } catch (error) {
    return {
      mode: "bullmq",
      ready: false,
      details: error instanceof Error ? error.message : "Queue health check failed",
    };
  }
}
