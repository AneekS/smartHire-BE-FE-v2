import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkRateLimit,
  uploadRateLimitKey,
  scoreRateLimitKey,
  getUploadLimit,
  getScoreLimit,
  UPLOAD_WINDOW_SEC,
  SCORE_WINDOW_SEC,
} from "@/lib/rate-limit";

const mockPipeline = vi.fn();
const mockRedis = {
  pipeline: () => mockPipeline(),
  zrem: vi.fn(),
  zrange: vi.fn(),
};

vi.mock("ioredis", () => ({
  default: vi.fn(() => mockRedis),
}));

describe("rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
  });

  it("uses per-user upload key and 5/min default limit", () => {
    expect(uploadRateLimitKey("user-1")).toBe("upload:user:user-1");
    expect(getUploadLimit()).toBe(5);
    expect(UPLOAD_WINDOW_SEC).toBe(60);
  });

  it("uses per-tenant score key and 10/min default limit", () => {
    expect(scoreRateLimitKey("tenant-1")).toBe("score:tenant:tenant-1");
    expect(getScoreLimit()).toBe(10);
    expect(SCORE_WINDOW_SEC).toBe(60);
  });

  it("respects env overrides for limits", () => {
    vi.stubEnv("RATE_LIMIT_UPLOAD_PER_MIN", "3");
    vi.stubEnv("RATE_LIMIT_SCORE_PER_TENANT_PER_MIN", "7");
    expect(getUploadLimit()).toBe(3);
    expect(getScoreLimit()).toBe(7);
  });

  it("fails open without redis in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = await checkRateLimit("test:key", 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("fails closed without redis in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = await checkRateLimit("test:key", 5, 60);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBe(60);
  });

  it("allows requests under limit when redis is configured", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("NODE_ENV", "production");

    mockPipeline.mockReturnValue({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 2],
        [null, 1],
      ]),
    });

    const result = await checkRateLimit(uploadRateLimitKey("u1"), 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });
});
