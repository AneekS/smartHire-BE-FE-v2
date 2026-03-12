/**
 * In-memory fallback cache used when Redis is unavailable.
 * Keeps the app functional in local dev without Redis.
 */
type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const inMemoryCache = new Map<string, CacheEntry<unknown>>();

// Reuse the global Redis singleton from redis.ts — no second connection.
import { redis as redisClient } from "@/lib/redis";

function now(): number {
  return Date.now();
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("[CACHE][GET_FAILED]", error);
  }

  // In-memory fallback when Redis is unreachable
  const cached = inMemoryCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt < now()) {
    inMemoryCache.delete(key);
    return null;
  }

  return cached.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return;
  } catch (error) {
    console.error("[CACHE][SET_FAILED]", error);
  }

  // In-memory fallback when Redis is unreachable
  inMemoryCache.set(key, {
    value,
    expiresAt: now() + ttlSeconds * 1000,
  });
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redisClient.del(key);
    return;
  } catch (error) {
    console.error("[CACHE][DELETE_FAILED]", error);
  }

  inMemoryCache.delete(key);
}

export async function cacheHealth(): Promise<{
  mode: "redis" | "memory";
  ready: boolean;
  details?: string;
}> {
  const key = `health:cache:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  try {
    await redisClient.set(key, "1", "EX", 5);
    const value = await redisClient.get(key);
    await redisClient.del(key);

    return {
      mode: "redis",
      ready: value === "1",
      details: value === "1" ? "Redis read/write check passed" : "Redis read/write check failed",
    };
  } catch (error) {
    return {
      mode: process.env.REDIS_URL || process.env.REDIS_HOST ? "redis" : "memory",
      ready: false,
      details: error instanceof Error ? error.message : "Redis health check failed",
    };
  }
}
