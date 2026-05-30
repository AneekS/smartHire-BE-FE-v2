import type { Queue } from "bullmq";
import Redis from "ioredis";
import { getBullConnectionOptions } from "@/lib/redis-options";
import {
  EMBED_QUEUE_NAMES,
  RedisJobQueue,
  assertRedisHealthy as redisAssertHealthy,
} from "@/queue/redis-queue";

export { EMBED_QUEUE_NAMES };

let redisClient: Redis | null = null;

export function getRedisConnection(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    });
  }
  return redisClient;
}

/** BullMQ worker connection options (Azure Redis TLS). */
export function getWorkerConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for BullMQ workers");
  }
  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) {
    throw new Error("Failed to parse REDIS_URL for BullMQ worker");
  }
  return connection;
}

export function getQueue(name: string): Queue | null {
  return RedisJobQueue.getEmbedQueue(name);
}

export async function assertRedisHealthy(): Promise<void> {
  return redisAssertHealthy();
}

export async function pingRedis(): Promise<boolean> {
  return RedisJobQueue.ping();
}
