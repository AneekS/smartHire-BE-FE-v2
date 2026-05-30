import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditLogger } from "@/auth/AuditLogger";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
  },
}));

vi.mock("@/monitoring/logger", () => ({
  getLogger: () => ({ warn: vi.fn() }),
}));

import { prisma } from "@/lib/prisma";

describe("AuditLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes audit record with request metadata", async () => {
    const req = {
      headers: new Headers({
        "x-forwarded-for": "203.0.113.1, 10.0.0.1",
        "user-agent": "vitest",
      }),
    };

    await AuditLogger.logWithClient(prisma, "RESUME_UPLOADED", {
      tenantId: "tenant-1",
      userId: "user-1",
      entityId: "resume-1",
      entityType: "Resume",
      req,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "RESUME_UPLOADED",
          tenantId: "tenant-1",
          userId: "user-1",
          ipAddress: "203.0.113.1",
          userAgent: "vitest",
        }),
      })
    );
  });

  it("log is fire-and-forget and does not throw", () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValueOnce(new Error("db down"));
    expect(() =>
      AuditLogger.log("ADMIN_ACCESS", { tenantId: "tenant-1" })
    ).not.toThrow();
  });
});
