const DEFAULT_HALF_LIFE_YEARS = 3;

/**
 * Recency decay for skills based on years since last used.
 * ≤1y→1.00 | ≤2→0.95 | ≤3→0.88 | ≤5→0.75 | ≤7→0.60 | 7+→0.45
 */
export function applyRecencyDecay(
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

/** Exponential half-life decay for experience roles (spec: 3-year half-life). */
export function experienceHalfLifeDecay(
  yearsAgo: number,
  halfLifeYears: number = DEFAULT_HALF_LIFE_YEARS
): number {
  if (yearsAgo <= 0) return 1;
  return Math.pow(0.5, yearsAgo / halfLifeYears);
}
