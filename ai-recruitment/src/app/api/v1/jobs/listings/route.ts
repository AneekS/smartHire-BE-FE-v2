import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import {
  UnauthorizedError,
  isDatabaseConnectionError,
  withAuth,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { mapJobListingForClient } from "@/lib/map-job-listing";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { dbUser } = await withAuth(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const searchRaw = searchParams.get("search");

    const where: Prisma.JobListingWhereInput = { isActive: true };

    if (category && category !== "All") {
      where.category = category;
    }

    if (searchRaw?.trim()) {
      const term = searchRaw.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { category: { contains: term, mode: "insensitive" } },
      ];
    }

    const listings = await prisma.jobListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const listingIds = listings.map((l) => l.id);
    let scoreMap: Record<string, { score: number }> = {};

    if (listingIds.length > 0) {
      const candidate = await prisma.candidate.findUnique({
        where: { userId: dbUser.id },
        select: { id: true },
      });

      if (candidate) {
        const scores = await prisma.jobAtsScore.findMany({
          where: {
            candidateId: candidate.id,
            listingId: { in: listingIds },
          },
          orderBy: { createdAt: "desc" },
        });

        for (const s of scores) {
          if (!scoreMap[s.listingId]) {
            scoreMap[s.listingId] = { score: s.score };
          }
        }
      }
    }

    const enriched = listings.map((listing) =>
      mapJobListingForClient({
        ...listing,
        existingScore: scoreMap[listing.id]
          ? { score: scoreMap[listing.id].score, label: null }
          : null,
      })
    );

    return ok(enriched);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    if (isDatabaseConnectionError(error)) {
      return err(
        "Database connection timed out. Check Azure PostgreSQL networking.",
        503
      );
    }
    const msg = error instanceof Error ? error.message : "Failed to fetch";
    return err(msg, 500);
  }
}
