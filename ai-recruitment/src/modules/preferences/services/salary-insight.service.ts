import { prisma } from "@/lib/db";
import { CacheService, CACHE_TTL_SECONDS } from "@/lib/cache-utils";
import type { ExperienceLevel } from "@/modules/preferences/types/preferences.types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function defaultMultiplier(experience: ExperienceLevel): number {
  switch (experience) {
    case "ENTRY":
      return 0.75;
    case "MID":
      return 1;
    case "SENIOR":
      return 1.35;
    case "LEAD":
      return 1.65;
    default:
      return 1;
  }
}

export async function getSalaryInsights(
  role: string,
  location: string,
  experience: ExperienceLevel,
) {
  const cacheKey = `salary-insight:${normalize(role)}:${normalize(location)}:${experience}`;
  const cached = await CacheService.get<{
    role: string;
    location: string;
    experience: ExperienceLevel;
    salaryMin: number;
    salaryMedian: number;
    salaryMax: number;
    source: string;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const exact = await prisma.salaryInsight.findFirst({
    where: {
      role: { equals: role, mode: "insensitive" },
      location: { equals: location, mode: "insensitive" },
      experience,
    },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      location: true,
      experience: true,
      salaryMin: true,
      salaryMedian: true,
      salaryMax: true,
      createdAt: true,
    },
  });

  if (exact) {
    const payload = { ...exact, source: "db" };
    await CacheService.set(cacheKey, payload, CACHE_TTL_SECONDS);
    return payload;
  }

  const baseline = await prisma.salaryInsight.findFirst({
    where: {
      role: { equals: role, mode: "insensitive" },
      location: { equals: location, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      salaryMin: true,
      salaryMedian: true,
      salaryMax: true,
    },
  });

  if (baseline) {
    const row = baseline;
    const m = defaultMultiplier(experience);
    const projected = {
      role,
      location,
      experience,
      salaryMin: Math.round(row.salaryMin * m),
      salaryMedian: Math.round(row.salaryMedian * m),
      salaryMax: Math.round(row.salaryMax * m),
      source: "derived",
    };

    await CacheService.set(cacheKey, projected, CACHE_TTL_SECONDS);
    return projected;
  }

  const fallbackMedian =
    experience === "ENTRY" ? 1_000_000 : experience === "MID" ? 1_700_000 : experience === "SENIOR" ? 2_300_000 : 3_000_000;

  const fallback = {
    role,
    location,
    experience,
    salaryMin: Math.round(fallbackMedian * 0.7),
    salaryMedian: fallbackMedian,
    salaryMax: Math.round(fallbackMedian * 1.3),
    source: "fallback",
  };

  await CacheService.set(cacheKey, fallback, Math.min(CACHE_TTL_SECONDS, 300));
  return fallback;
}
