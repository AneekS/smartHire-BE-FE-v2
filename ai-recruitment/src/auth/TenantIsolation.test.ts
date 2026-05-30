import { describe, it, expect } from "vitest";
import { addTenantFilter, assertTenantMatch } from "@/auth/TenantIsolation";
import { ForbiddenError } from "@/auth/errors";

describe("TenantIsolation", () => {
  it("addTenantFilter merges tenantId into where clause", () => {
    expect(addTenantFilter({ status: "ACTIVE" }, "tenant-1")).toEqual({
      status: "ACTIVE",
      tenantId: "tenant-1",
    });
  });

  it("assertTenantMatch passes for matching tenant", () => {
    expect(() => assertTenantMatch("tenant-1", "tenant-1")).not.toThrow();
  });

  it("assertTenantMatch throws ForbiddenError on mismatch", () => {
    expect(() => assertTenantMatch("tenant-2", "tenant-1")).toThrow(ForbiddenError);
  });
});
