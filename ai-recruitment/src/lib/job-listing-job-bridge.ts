import { prisma } from "@/lib/prisma";
import type { IndustryProfile, Job, JobListing, JobType } from "@prisma/client";
import { jobSchemaFromText } from "@/scoring/jd-heuristic";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { mapIndustryToProfile, mapSeniorityToPrisma } from "@/scoring/types";

function mapListingJobType(jobType?: string | null): JobType {
  const t = (jobType ?? "").toLowerCase();
  if (t.includes("part")) return "PART_TIME";
  if (t.includes("contract") || t.includes("freelance")) return "CONTRACT";
  if (t.includes("intern")) return "INTERNSHIP";
  if (t.includes("remote")) return "REMOTE";
  return "FULL_TIME";
}

function listingJdText(listing: JobListing): string {
  return [
    listing.description,
    listing.requirements,
    listing.responsibilities,
    listing.niceToHave,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function resolvePosterUserId(tenantId: string, candidateId: string): Promise<string> {
  const recruiter = await prisma.user.findFirst({
    where: {
      tenantId,
      role: { in: ["RECRUITER", "ADMIN", "HIRING_MANAGER"] },
    },
    select: { id: true },
  });
  if (recruiter) return recruiter.id;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { userId: true },
  });
  if (!candidate?.userId) {
    throw new Error("No user available to attach catalog job");
  }
  return candidate.userId;
}

async function resolveCompanyId(
  tenantId: string,
  companyName: string
): Promise<string> {
  const name = companyName.trim() || "Job catalog";
  const existing = await prisma.company.findFirst({
    where: { tenantId, name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.company.create({
    data: {
      name,
      tenantId,
      industryProfile: "GENERAL",
    },
  });
  return created.id;
}

/**
 * Upserts a Prisma Job row mirroring a public job_listing so ATSEngine.compute can run.
 * Uses the same id as the listing for stable lookups. Idempotent.
 */
export async function ensureJobFromListing(
  listing: JobListing,
  tenantId: string,
  candidateId: string
): Promise<Job> {
  const description =
    listing.description?.trim() ||
    listingJdText(listing).slice(0, 5000) ||
    listing.title;
  const requirements =
    listing.requirements?.trim() ||
    listing.responsibilities?.trim() ||
    "See job description";

  const userId = await resolvePosterUserId(tenantId, candidateId);
  const companyId = await resolveCompanyId(tenantId, listing.companyName);

  const heuristic = jobSchemaFromText({
    jobId: listing.id,
    jdText: listingJdText(listing),
    jobTitle: listing.title,
    companyName: listing.companyName,
  });

  const industryProfile: IndustryProfile = mapIndustryToProfile(
    heuristic.industryDomain
  );
  const seniorityBand = mapSeniorityToPrisma(heuristic.seniorityExpected);

  const job = await prisma.job.upsert({
    where: { id: listing.id },
    create: {
      id: listing.id,
      title: listing.title,
      description,
      requirements,
      location: listing.location ?? "Remote",
      type: mapListingJobType(listing.jobType),
      status: "ACTIVE",
      salary: listing.salaryRange,
      experienceLevel: listing.experienceLevel,
      experienceMin: heuristic.minYearsExperience,
      experienceMax: heuristic.maxYearsExperience,
      requiredSkills: listing.techStack ?? [],
      userId,
      companyId,
      tenantId,
      industryProfile,
      seniorityBand,
    },
    update: {
      title: listing.title,
      description,
      requirements,
      location: listing.location ?? "Remote",
      status: "ACTIVE",
      tenantId,
      experienceLevel: listing.experienceLevel,
      experienceMin: heuristic.minYearsExperience,
      experienceMax: heuristic.maxYearsExperience,
      requiredSkills: listing.techStack ?? [],
      industryProfile,
      seniorityBand,
    },
  });

  const skills = [
    ...(listing.techStack ?? []),
    ...heuristic.requiredSkills.map((s) => s.skillName),
  ];
  const unique = [...new Set(skills.map((s) => s.trim()).filter(Boolean))];

  await prisma.jobSkill.deleteMany({ where: { jobId: job.id } });
  if (unique.length) {
    await prisma.jobSkill.createMany({
      data: unique.slice(0, 40).map((name, index) => ({
        jobId: job.id,
        name,
        normalized: SkillCanonicalizer.canonicalize(name),
        importance: index < 5 ? 3 : 2,
      })),
      skipDuplicates: true,
    });
  }

  return job;
}
