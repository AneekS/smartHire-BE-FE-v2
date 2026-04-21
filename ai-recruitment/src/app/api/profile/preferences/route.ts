/**
 * GET /api/profile/preferences
 *
 * Unified endpoint that returns the candidate's preferred roles and salary
 * profile in a single round-trip.  The UI should use this instead of calling
 * /api/preferred-roles and /api/v1/salary separately.
 *
 * Response shape:
 * {
 *   preferredRoles: Array<{ id, role, priority, confidenceScore, source }>,
 *   salaryProfile:  SalaryProfile | null,
 * }
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const email = r.user!.email;

      const candidate = await prisma.candidate.findFirst({
        where: { user: { email } },
        select: {
          id: true,
          preferredRoles: {
            orderBy: [
              { priority: "asc" },
              { confidenceScore: "desc" },
            ] as Prisma.PreferredRoleOrderByWithRelationInput[],
            select: {
              id: true,
              role: true,
              priority: true,
              confidenceScore: true,
              source: true,
              updatedAt: true,
            },
          },
          user: {
            select: {
              salaryProfile: true,
            },
          },
        },
      });

      if (!candidate) {
        return NextResponse.json(
          { preferredRoles: [], salaryProfile: null },
        );
      }

      const preferredRoles = (candidate.preferredRoles ?? []).map((r) => ({
        id: r.id,
        role: r.role,
        priority: r.priority,
        confidenceScore: r.confidenceScore,
        source: r.source,
        updatedAt: r.updatedAt,
      }));

      return NextResponse.json({
        preferredRoles,
        salaryProfile: candidate.user?.salaryProfile ?? null,
      });
    } catch (e) {
      console.error("[GET /api/profile/preferences]", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to fetch preferences" },
        { status: 500 },
      );
    }
  });
}
