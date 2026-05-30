/**
 * Create Prisma Job rows from active job_listings.
 *
 * Usage: npx tsx --import ./scripts/load-env.mjs scripts/sync-listing-jobs.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureJobFromListing } from "../src/lib/job-listing-job-bridge";

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "default";
  const tenant = await prisma.tenant.findFirst({ where: { slug } });
  if (!tenant) {
    throw new Error(`Tenant slug=${slug} not found. Run npm run db:backfill-tenant-id`);
  }

  const candidate = await prisma.candidate.findFirst({
    where: { user: { tenantId: tenant.id } },
    select: { id: true },
  });
  if (!candidate) {
    throw new Error("No candidate for tenant");
  }

  const listings = await prisma.jobListing.findMany({
    where: { isActive: true },
  });

  for (const listing of listings) {
    await ensureJobFromListing(listing, tenant.id, candidate.id);
  }

  console.log(
    `Synced ${listings.length} listings → Job for tenant ${tenant.slug}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
