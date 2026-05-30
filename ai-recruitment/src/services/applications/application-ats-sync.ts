import { prisma } from "@/lib/db";

/**
 * Keeps Application.aiScore aligned with canonical ATSEngine / job_ats_scores output.
 */
export async function syncApplicationAiScore(
  candidateId: string,
  jobId: string,
  score: number
): Promise<void> {
  await prisma.application.updateMany({
    where: { candidateId, jobId },
    data: { aiScore: score },
  });
}

export async function resolveCanonicalJobScore(
  candidateId: string,
  jobId: string
): Promise<number | null> {
  const application = await prisma.application.findUnique({
    where: { jobId_candidateId: { jobId, candidateId } },
    select: {
      applicationAtsScore: { select: { finalScore: true } },
    },
  });

  if (application?.applicationAtsScore?.finalScore != null) {
    return Math.round(application.applicationAtsScore.finalScore);
  }

  const listingScore = await prisma.jobAtsScore.findUnique({
    where: {
      candidateId_listingId: { candidateId, listingId: jobId },
    },
    select: { score: true },
  });

  if (listingScore) {
    return listingScore.score;
  }

  return null;
}

export async function syncApplicationAiScoreFromStores(
  candidateId: string,
  jobId: string
): Promise<number | null> {
  const score = await resolveCanonicalJobScore(candidateId, jobId);
  if (score == null) return null;
  await syncApplicationAiScore(candidateId, jobId, score);
  return score;
}
