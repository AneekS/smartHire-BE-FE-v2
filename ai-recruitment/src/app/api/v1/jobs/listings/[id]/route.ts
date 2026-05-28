import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth(req);
    const { id } = await params;

    const listing = await prisma.jobListing.findFirst({
      where: { id, isActive: true },
    });

    if (!listing) return err("Job not found", 404);

    const candidate = await prisma.candidate.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    });

    let existingScore = null;
    if (candidate) {
      existingScore = await prisma.jobAtsScore.findFirst({
        where: { candidateId: candidate.id, listingId: id },
        orderBy: { createdAt: "desc" },
      });
    }

    return ok({ ...listing, existingScore });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg = error instanceof Error ? error.message : "Failed";
    return err(msg, 500);
  }
}
