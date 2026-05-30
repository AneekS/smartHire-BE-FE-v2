import { NextResponse } from "next/server";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";
import { withAuth } from "@/lib/auth-middleware";
import { ForbiddenError } from "@/auth/errors";
import type { UserRole } from "@/auth/ClerkAuthHelper";

export type Permission =
  | "own_resume_crud"
  | "view_own_ats_scores"
  | "apply_to_jobs"
  | "view_tenant_candidates"
  | "mark_outcomes"
  | "manage_own_jobs"
  | "view_calibration_status"
  | "trigger_calibration"
  | "internal_dashboard";

const PERMISSIONS: Record<Permission, UserRole[]> = {
  own_resume_crud: ["CANDIDATE", "ADMIN"],
  view_own_ats_scores: ["CANDIDATE", "ADMIN"],
  apply_to_jobs: ["CANDIDATE", "ADMIN"],
  view_tenant_candidates: ["RECRUITER", "HIRING_MANAGER", "ADMIN"],
  mark_outcomes: ["RECRUITER", "HIRING_MANAGER", "ADMIN"],
  manage_own_jobs: ["RECRUITER", "HIRING_MANAGER", "ADMIN"],
  view_calibration_status: ["HIRING_MANAGER", "ADMIN"],
  trigger_calibration: ["ADMIN"],
  internal_dashboard: ["ADMIN"],
};

export class RBACGuard {
  static hasPermission(role: UserRole, permission: Permission): boolean {
    return PERMISSIONS[permission].includes(role);
  }

  static requirePermission(role: UserRole, permission: Permission): void {
    if (!RBACGuard.hasPermission(role, permission)) {
      throw new ForbiddenError();
    }
  }

  static async withPermission(
    req: AuthenticatedRequest,
    permission: Permission,
    handler: (req: AuthenticatedRequest) => Promise<Response>
  ): Promise<Response> {
    return withAuth(req, async (authedReq) => {
      try {
        RBACGuard.requirePermission(authedReq.user!.role, permission);
        return handler(authedReq);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        throw error;
      }
    });
  }
}

/** Recruiter-tier permissions (RECRUITER + HIRING_MANAGER + ADMIN). */
export function withRecruiterAccess(
  req: AuthenticatedRequest,
  handler: (req: AuthenticatedRequest) => Promise<Response>
): Promise<Response> {
  return RBACGuard.withPermission(req, "view_tenant_candidates", handler);
}
