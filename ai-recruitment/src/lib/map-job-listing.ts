import type { JobListing } from "@prisma/client";
import type { JobListing as ClientJobListing } from "@/store/useJobATSStore";

type ListingWithScore = JobListing & {
  existingScore: { score: number; label?: string | null } | null;
};

/** Map Prisma JobListing → shape expected by Job ATS UI. */
export function mapJobListingForClient(
  listing: ListingWithScore
): ClientJobListing {
  const jd = listing.description ?? "";
  const combinedDescription = [
    jd,
    listing.requirements,
    listing.responsibilities,
    listing.niceToHave,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: listing.id,
    job_title: listing.title,
    company_name: listing.companyName,
    company_logo: null,
    location: listing.location ?? "Remote",
    job_type: listing.jobType ?? "Full-time",
    experience_level: listing.experienceLevel ?? "Not specified",
    salary_range: listing.salaryRange,
    tech_stack: listing.techStack ?? [],
    category: listing.category ?? "General",
    is_featured: listing.isFeatured,
    posted_at: listing.createdAt.toISOString(),
    requirements: listing.requirements ?? combinedDescription,
    existingScore: listing.existingScore
      ? {
          score: Math.round(listing.existingScore.score),
          label: listing.existingScore.label ?? null,
        }
      : null,
  };
}
