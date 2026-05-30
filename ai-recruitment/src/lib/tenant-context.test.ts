import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTenantId, resetTenantCache } from "@/lib/tenant-context";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("resolveTenantId", () => {
  beforeEach(() => {
    resetTenantCache();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns DEFAULT_TENANT_ID when env is set and tenant exists", async () => {
    vi.stubEnv("DEFAULT_TENANT_ID", "tenant-abc");
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-abc",
      name: "Test",
      slug: "test",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const id = await resolveTenantId();
    expect(id).toBe("tenant-abc");
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: "tenant-abc" },
    });
  });

  it("finds or creates tenant by slug when DEFAULT_TENANT_ID is unset", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.tenant.create).mockResolvedValue({
      id: "tenant-new",
      name: "Default Tenant",
      slug: "default",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const id = await resolveTenantId();
    expect(id).toBe("tenant-new");
    expect(prisma.tenant.create).toHaveBeenCalled();
  });

  it("caches resolved tenant id", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-cached",
      name: "Cached",
      slug: "default",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await resolveTenantId();
    await resolveTenantId();
    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });
});
