import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecruiterAccessGuard } from "@/auth/RecruiterAccessGuard";
import { ForbiddenError } from "@/auth/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recruiter: { findUnique: vi.fn() },
    job: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    candidate: { findFirst: vi.fn() },
  },
}));

vi.mock("@/feedback/decisions", () => ({
  RecruiterDecisionService: {
    getRecruiterCompanyId: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { RecruiterDecisionService } from "@/feedback/decisions";

describe("RecruiterAccessGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canAccessJob returns true when user owns job", async () => {
    vi.mocked(prisma.job.findFirst).mockResolvedValue({
      userId: "user-1",
    } as never);

    const allowed = await RecruiterAccessGuard.canAccessJob(
      "user-1",
      "job-1",
      "tenant-1"
    );
    expect(allowed).toBe(true);
  });

  it("canAccessJob falls back to shared company", async () => {
    vi.mocked(prisma.job.findFirst).mockResolvedValue({
      userId: "owner-1",
    } as never);
    vi.mocked(RecruiterDecisionService.getRecruiterCompanyId).mockResolvedValue("co-1");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ companyId: "co-1" } as never);

    const allowed = await RecruiterAccessGuard.canAccessJob(
      "recruiter-1",
      "job-1",
      "tenant-1"
    );
    expect(allowed).toBe(true);
  });

  it("requireRecruiterProfile throws when profile missing", async () => {
    vi.mocked(prisma.recruiter.findUnique).mockResolvedValue(null);
    await expect(
      RecruiterAccessGuard.requireRecruiterProfile("user-1")
    ).rejects.toThrow(ForbiddenError);
  });
});
