import type { Queue } from "bullmq";
import Redis from "ioredis";
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

export function getQueue(name: string): Queue | null {
  return RedisJobQueue.getEmbedQueue(name);
}

export async function assertRedisHealthy(): Promise<void> {
  return redisAssertHealthy();
}

export async function pingRedis(): Promise<boolean> {
  return RedisJobQueue.ping();
}
