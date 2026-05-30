import {
  checkRateLimit,
  getScoreLimit,
  getUploadLimit,
  scoreRateLimitKey,
  uploadRateLimitKey,
  SCORE_WINDOW_SEC,
  UPLOAD_WINDOW_SEC,
} from "@/lib/rate-limit";

export interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class RateLimiter {
  static async limit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResponse> {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const result = await checkRateLimit(key, maxRequests, windowSec);
    const resetAt = Date.now() + result.retryAfterSec * 1000;
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt,
    };
  }

  static async uploadLimit(userId: string): Promise<RateLimitResponse> {
    return RateLimiter.limit(
      uploadRateLimitKey(userId),
      UPLOAD_WINDOW_SEC * 1000,
      getUploadLimit()
    );
  }

  static async atsLimit(tenantId: string): Promise<RateLimitResponse> {
    return RateLimiter.limit(
      scoreRateLimitKey(tenantId),
      SCORE_WINDOW_SEC * 1000,
      getScoreLimit()
    );
  }
}

export {
  checkRateLimit,
  getRedisClient,
  getScoreLimit,
  getUploadLimit,
  scoreRateLimitKey,
  uploadRateLimitKey,
  SCORE_WINDOW_SEC,
  UPLOAD_WINDOW_SEC,
} from "@/lib/rate-limit";
