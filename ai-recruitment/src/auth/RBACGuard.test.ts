import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth-middleware", () => ({
  withAuth: vi.fn(),
}));

import { RBACGuard } from "@/auth/RBACGuard";
import type { UserRole } from "@/auth/ClerkAuthHelper";

describe("RBACGuard", () => {
  it("allows candidates own resume permissions", () => {
    expect(RBACGuard.hasPermission("CANDIDATE", "own_resume_crud")).toBe(true);
    expect(RBACGuard.hasPermission("CANDIDATE", "view_tenant_candidates")).toBe(false);
  });

  it("allows recruiters tenant candidate access", () => {
    expect(RBACGuard.hasPermission("RECRUITER", "view_tenant_candidates")).toBe(true);
    expect(RBACGuard.hasPermission("RECRUITER", "mark_outcomes")).toBe(true);
    expect(RBACGuard.hasPermission("RECRUITER", "view_calibration_status")).toBe(false);
  });

  it("grants hiring manager recruiter permissions plus calibration read", () => {
    expect(RBACGuard.hasPermission("HIRING_MANAGER", "mark_outcomes")).toBe(true);
    expect(RBACGuard.hasPermission("HIRING_MANAGER", "view_calibration_status")).toBe(true);
    expect(RBACGuard.hasPermission("HIRING_MANAGER", "trigger_calibration")).toBe(false);
  });

  it("grants admin all permissions", () => {
    const permissions = [
      "own_resume_crud",
      "view_tenant_candidates",
      "trigger_calibration",
      "internal_dashboard",
    ] as const;
    for (const permission of permissions) {
      expect(RBACGuard.hasPermission("ADMIN", permission)).toBe(true);
    }
  });

  it("throws on requirePermission failure", () => {
    expect(() =>
      RBACGuard.requirePermission("CANDIDATE" as UserRole, "trigger_calibration")
    ).toThrow("Forbidden");
  });
});
