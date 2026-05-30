import { prisma } from "@/lib/db";

type JobWithMatchScore = { id: string; matchScore: number };

/**
 * When the candidate has scored a job via Job ATS, prefer that canonical score
 * over the lightweight discovery matchScore.
 */
export async function enrichJobsWithCanonicalAtsScores<T extends JobWithMatchScore>(
  candidateId: string,
  jobs: T[]
): Promise<T[]> {
  if (!jobs.length) return jobs;

  const jobIds = jobs.map((j) => j.id);
  const scores = await prisma.jobAtsScore.findMany({
    where: {
      candidateId,
      listingId: { in: jobIds },
    },
    select: { listingId: true, score: true },
  });

  if (!scores.length) return jobs;

  const scoreByJobId = new Map(scores.map((s) => [s.listingId, s.score]));

  return jobs.map((job) => {
    const canonical = scoreByJobId.get(job.id);
    if (canonical == null) return job;
    return { ...job, matchScore: canonical };
  });
}
