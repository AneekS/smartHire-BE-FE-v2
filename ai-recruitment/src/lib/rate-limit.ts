import Redis from "ioredis";

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redisClient) {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      tls: url.startsWith("rediss://") ? {} : undefined,
    });
  }
  return redisClient;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Sliding-window rate limit using a sorted set of timestamps.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }

  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const redisKey = `rl:${key}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, now, `${now}`);
  pipeline.zcard(redisKey);
  pipeline.expire(redisKey, windowSec);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) ?? 0;

  if (count > limit) {
    await redis.zrem(redisKey, `${now}`);
    const oldest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
    const oldestTs = oldest.length >= 2 ? parseInt(oldest[1]!, 10) : now;
    const retryAfterSec = Math.max(1, Math.ceil((oldestTs + windowSec * 1000 - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSec: 0 };
}

export function uploadRateLimitKey(tenantId: string): string {
  return `upload:${tenantId}`;
}

export function scoreRateLimitKey(userId: string): string {
  return `score:${userId}`;
}

export function getUploadLimit(): number {
  return parseInt(process.env.RATE_LIMIT_UPLOAD_PER_HOUR ?? "100", 10);
}

export function getScoreLimit(): number {
  return parseInt(process.env.RATE_LIMIT_SCORE_PER_HOUR ?? "1000", 10);
}
