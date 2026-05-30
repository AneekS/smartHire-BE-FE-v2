import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService } from "@/services/NotificationService";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { create: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/ops-alerts", () => ({
  sendOpsAlert: vi.fn(),
}));

import { prisma } from "@/lib/prisma";

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a notification record", async () => {
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: "n-1",
    } as never);

    const row = await NotificationService.create({
      userId: "u-1",
      tenantId: "t-1",
      type: "SYSTEM",
      title: "Test",
      body: "Hello",
    });

    expect(row.id).toBe("n-1");
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it("notifyAtsScoreComplete skips when scoreId is null", async () => {
    const row = await NotificationService.notifyAtsScoreComplete({
      userId: "u-1",
      tenantId: "t-1",
      scoreId: null,
      finalScore: 80,
      jobId: "j-1",
    });
    expect(row).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
