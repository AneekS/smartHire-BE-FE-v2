/**
 * Profile Completeness Engine
 *
 * Scoring rules (must sum to 100):
 *   Name        10%
 *   Headline    10%
 *   Education   15%
 *   Skills      20%
 *   Resume      20%
 *   Projects    10%
 *   Experience  10%
 *   CareerPrefs  5%
 */

import { prisma } from "@/lib/db";

interface CompletenessWeights {
  name:        number;
  headline:    number;
  education:   number;
  skills:      number;
  resume:      number;
  projects:    number;
  experience:  number;
  careerPrefs: number;
}

const WEIGHTS: CompletenessWeights = {
  name:        10,
  headline:    10,
  education:   15,
  skills:      20,
  resume:      20,
  projects:    10,
  experience:  10,
  careerPrefs:  5,
};

export interface CompletenessResult {
  score:      number; // 0-100
  sections:   Record<keyof CompletenessWeights, boolean>;
  missing:    string[];
}

/**
 * Calculate completeness from an already-fetched candidate object.
 * Pass the full Prisma candidate with relations included.
 */
export function calculateCompleteness(candidate: {
  name?:           string | null;
  headline?:       string | null;
  resumeUrl?:      string | null;
  educations?:     unknown[];
  skillRecords?:   unknown[];
  experiences?:    unknown[];
  projects?:       unknown[];
  careerPreference?: unknown | null;
}): CompletenessResult {
  const sections = {
    name:        !!(candidate.name?.trim()),
    headline:    !!(candidate.headline?.trim()),
    education:   !!(candidate.educations?.length),
    skills:      !!(candidate.skillRecords && candidate.skillRecords.length >= 3),
    resume:      !!(candidate.resumeUrl),
    projects:    !!(candidate.projects?.length),
    experience:  !!(candidate.experiences?.length),
    careerPrefs: !!(candidate.careerPreference),
  };

  let score = 0;
  const missing: string[] = [];

  (Object.keys(WEIGHTS) as Array<keyof CompletenessWeights>).forEach((key) => {
    if (sections[key]) {
      score += WEIGHTS[key];
    } else {
      missing.push(key);
    }
  });

  return { score: Math.min(100, score), sections, missing };
}

/**
 * Recalculate and persist the completeness score for a candidate.
 * Called after any profile mutation.
 */
export async function refreshCompleteness(candidateId: string): Promise<number> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      name:            true,
      headline:        true,
      resumeUrl:       true,
      educations:      { select: { id: true } },
      skillRecords:    { select: { id: true } },
      experiences:     { select: { id: true } },
      projects:        { select: { id: true } },
      careerPreference:{ select: { id: true } },
    },
  });

  if (!candidate) return 0;

  const { score } = calculateCompleteness(candidate);

  await prisma.candidate.update({
    where: { id: candidateId },
    data:  { profileCompleteness: score },
  });

  return score;
}
