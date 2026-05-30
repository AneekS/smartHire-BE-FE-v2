import { describe, it, expect, vi } from "vitest";
import { RateLimiter } from "@/security/RateLimiter";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 4,
    retryAfterSec: 0,
  }),
  getUploadLimit: vi.fn().mockReturnValue(5),
  getScoreLimit: vi.fn().mockReturnValue(10),
  uploadRateLimitKey: vi.fn((id: string) => `upload:user:${id}`),
  scoreRateLimitKey: vi.fn((id: string) => `score:tenant:${id}`),
  UPLOAD_WINDOW_SEC: 60,
  SCORE_WINDOW_SEC: 60,
}));

import { checkRateLimit, uploadRateLimitKey } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  it("delegates limit() to checkRateLimit", async () => {
    const result = await RateLimiter.limit("test:key", 60_000, 5);
    expect(checkRateLimit).toHaveBeenCalledWith("test:key", 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("uploadLimit uses upload key helper", async () => {
    await RateLimiter.uploadLimit("user-1");
    expect(uploadRateLimitKey).toHaveBeenCalledWith("user-1");
  });
});
