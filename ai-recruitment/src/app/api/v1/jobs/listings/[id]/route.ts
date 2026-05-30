import { NextRequest } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { jobToListingDto } from "@/lib/job-bridge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await withAuth(req);
    const { id } = await params;

    const job = await prisma.job.findFirst({
      where: { id, status: "ACTIVE" },
    });

    if (job) {
      return ok(jobToListingDto(job));
    }

    const listing = await prisma.jobListing.findFirst({
      where: { id, isActive: true },
    });

    if (!listing) return err("Job not found", 404);

    return ok(listing);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg = error instanceof Error ? error.message : "Failed";
    return err(msg, 500);
  }
}
