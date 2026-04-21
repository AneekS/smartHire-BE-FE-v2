/**
 * GET /api/profile/basic
 *
 * Returns the minimal identity fields needed to render the header/sidebar.
 * Intentionally small — avoids joining skills, education, experience, etc.
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const email = r.user!.email;

      const candidate = await prisma.candidate.findFirst({
        where: { user: { email } },
        select: {
          id: true,
          name: true,
          email: true,
          headline: true,
          location: true,
          photoUrl: true,
          avatarUrl: true,
          profileCompleteness: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              image: true,
              linkedInUrl: true,
              githubUrl: true,
              websiteUrl: true,
              publicProfile: true,
            },
          },
        },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      return NextResponse.json({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        headline: candidate.headline,
        location: candidate.location,
        avatar: candidate.avatarUrl ?? candidate.photoUrl ?? candidate.user?.image ?? null,
        profileCompleteness: candidate.profileCompleteness,
        linkedInUrl: candidate.user?.linkedInUrl ?? null,
        githubUrl: candidate.user?.githubUrl ?? null,
        websiteUrl: candidate.user?.websiteUrl ?? null,
        publicProfile: candidate.user?.publicProfile ?? false,
        updatedAt: candidate.updatedAt,
      });
    } catch (e) {
      console.error("[GET /api/profile/basic]", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to fetch basic profile" },
        { status: 500 },
      );
    }
  });
}
