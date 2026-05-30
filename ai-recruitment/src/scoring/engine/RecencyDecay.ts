import { RECENCY_HALF_LIFE_YEARS } from "@/scoring/constants";

/** Exponential half-life decay: decay(years) = 0.5^(years/halfLife) */
export function decay(yearsAgo: number, halfLifeYears = RECENCY_HALF_LIFE_YEARS): number {
  if (yearsAgo <= 0) return 1;
  return Math.pow(0.5, yearsAgo / halfLifeYears);
}

/** Stepped recency table for skill last-used year (legacy v3 behavior). */
export function applySkillRecencyDecay(
  lastUsedYear: number | null | undefined,
  currentYear: number = new Date().getFullYear()
): number {
  if (lastUsedYear == null || lastUsedYear <= 0) return 0.75;
  const yearsAgo = currentYear - lastUsedYear;
  if (yearsAgo <= 1) return 1.0;
  if (yearsAgo <= 2) return 0.95;
  if (yearsAgo <= 3) return 0.88;
  if (yearsAgo <= 5) return 0.75;
  if (yearsAgo <= 7) return 0.6;
  return 0.45;
}

export const experienceHalfLifeDecay = decay;
