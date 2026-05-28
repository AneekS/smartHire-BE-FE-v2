import crypto from "crypto";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { getBullConnectionOptions } from "@/lib/redis-options";
import { getPipelineEnv } from "@/config/pipeline-env";

/** Hash tags `{name}` required for Azure Redis Cluster (BullMQ multi-key Lua scripts). */
export const EMBED_QUEUE_NAMES = {
  HIGH: "{embed-high}",
  NORMAL: "{embed-normal}",
  RETRY: "{embed-retry}",
  PARSE: "{resume-parse}",
} as const;

export type EmbedPriority = "high" | "normal";

export interface EmbedJobPayload {
  resumeId: string;
  candidateId: string;
  tenantId?: string;
}

let redisClient: Redis | null = null;
const queueCache = new Map<string, Queue>();

function getConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  return getBullConnectionOptions(redisUrl);
}

function getQueue(name: string): Queue | null {
  const connection = getConnection();
  if (!connection) return null;

  if (queueCache.has(name)) return queueCache.get(name)!;

  const queue = new Queue(name, { connection });
  queueCache.set(name, queue);
  return queue;
}

function isPremiumTenant(tenantId?: string): boolean {
  if (!tenantId) return false;
  const env = getPipelineEnv();
  return env.PREMIUM_TENANT_IDS.includes(tenantId);
}

function resolveEmbedQueue(priority?: EmbedPriority, tenantId?: string): string {
  if (priority === "high" || isPremiumTenant(tenantId)) {
    return EMBED_QUEUE_NAMES.HIGH;
  }
  return EMBED_QUEUE_NAMES.NORMAL;
}

export class RedisJobQueue {
  static async ping(): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn("[RedisJobQueue] REDIS_URL not set");
      return false;
    }

    if (!redisClient) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        tls: redisUrl.startsWith("rediss://") ? {} : undefined,
      });
    }

    try {
      const pong = await redisClient.ping();
      return pong === "PONG";
    } catch (e) {
      console.error("[RedisJobQueue] Redis ping failed:", e);
      return false;
    }
  }

  static async enqueueEmbedding(params: {
    resumeId: string;
    candidateId: string;
    tenantId?: string;
    priority?: EmbedPriority;
  }): Promise<string> {
    const queueName = resolveEmbedQueue(params.priority, params.tenantId);
    const queue = getQueue(queueName);
    if (!queue) {
      throw new Error("Redis queue unavailable — configure REDIS_URL");
    }

    const jobId = crypto.randomUUID();
    await queue.add(
      "embed-chunks",
      {
        resumeId: params.resumeId,
        candidateId: params.candidateId,
        tenantId: params.tenantId,
      } satisfies EmbedJobPayload,
      {
        jobId,
        attempts: 4,
        backoff: { type: "custom" },
        removeOnFail: { age: 86_400 },
      }
    );

    return jobId;
  }

  static async enqueueToRetry(payload: EmbedJobPayload, delayMs = 60_000): Promise<string> {
    const queue = getQueue(EMBED_QUEUE_NAMES.RETRY);
    if (!queue) {
      throw new Error("Redis retry queue unavailable — configure REDIS_URL");
    }

    const jobId = crypto.randomUUID();
    await queue.add("embed-chunks", payload, {
      jobId,
      delay: delayMs,
      attempts: 3,
      backoff: { type: "custom" },
      removeOnFail: { age: 86_400 },
    });

    return jobId;
  }

  static async enqueueParseJob(params: {
    resumeId: string;
    userId: string;
    candidateId: string;
    tenantId?: string;
    fileName: string;
    mimeType: string;
    blobPath: string;
  }): Promise<string> {
    const queue = getQueue(EMBED_QUEUE_NAMES.PARSE);
    if (!queue) {
      throw new Error("Redis parse queue unavailable — configure REDIS_URL");
    }

    const jobId = crypto.randomUUID();
    await queue.add("parse-resume", params, { jobId });
    return jobId;
  }

  static getEmbedQueue(name: string): Queue | null {
    return getQueue(name);
  }

  /** Enqueue re-embed jobs for all resumes embedded since a given date. */
  static async enqueueBulkReindex(options: {
    since: Date;
    priority?: EmbedPriority;
  }): Promise<number> {
    const { prisma } = await import("@/lib/db");
    const versions = await prisma.resumeVersion.findMany({
      where: {
        embeddedAt: { gte: options.since },
        pipelineStatus: { in: ["EMBEDDED", "COMPLETE"] },
      },
      select: {
        id: true,
        tenantId: true,
        user: { select: { candidate: { select: { id: true } } } },
      },
    });

    let enqueued = 0;
    for (const v of versions) {
      const candidateId = v.user.candidate?.id;
      if (!candidateId) continue;
      try {
        await RedisJobQueue.enqueueEmbedding({
          resumeId: v.id,
          candidateId,
          tenantId: v.tenantId ?? undefined,
          priority: options.priority ?? "normal",
        });
        enqueued++;
      } catch (e) {
        console.warn("[RedisJobQueue] bulk reindex skip:", v.id, e);
      }
    }
    return enqueued;
  }
}

export async function assertRedisHealthy(): Promise<void> {
  const ok = await RedisJobQueue.ping();
  if (!ok) {
    throw new Error("[RedisJobQueue] Redis health check failed on startup");
  }
}
