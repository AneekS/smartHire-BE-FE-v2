import type { Prisma } from "@prisma/client";

type SearchParams = {
  role?: string;
  skills?: string;
  location?: string;
  experience?: string;
  salary?: string;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE";
  jobType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "REMOTE";
};

export type MatchSummary = {
  matchScore: number;
  readiness: number;
  missingSkills: string[];
};

export function parseSkills(skills?: string): string[] {
  if (!skills) return [];
  return skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseRange(raw?: string): { min: number; max: number | null } | null {
  if (!raw) return null;
  const value = raw.trim();

  const plusMatch = value.match(/^(\d+)\+$/);
  if (plusMatch) {
    return { min: Number(plusMatch[1]), max: null };
  }

  const rangeMatch = value.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
  }

  return null;
}

export function buildJobSearchWhere(params: SearchParams): Prisma.JobWhereInput {
  const where: Record<string, unknown> = {
    status: "ACTIVE",
  };
  const andClauses: Record<string, unknown>[] = [];

  if (params.role) {
    where.title = {
      contains: params.role.trim(),
      mode: "insensitive",
    };
  }

  if (params.location) {
    where.location = {
      contains: params.location.trim(),
      mode: "insensitive",
    };
  }

  const skillFilters = parseSkills(params.skills);
  if (skillFilters.length > 0) {
    where.requiredSkills = {
      hasSome: skillFilters,
    };
  }

  if (params.experience) {
    const expRange = parseRange(params.experience);
    if (expRange) {
      const expMax = expRange.max ?? 99;
      andClauses.push({
          OR: [
            {
              AND: [
                { experienceMin: { lte: expMax } },
                {
                  OR: [
                    { experienceMax: null },
                    { experienceMax: { gte: expRange.min } },
                  ],
                },
              ],
            },
            {
              experienceLevel: {
                contains: params.experience,
                mode: "insensitive",
              },
            },
          ],
        });
    } else {
      where.experienceLevel = {
        contains: params.experience,
        mode: "insensitive",
      };
    }
  }

  if (params.salary) {
    const salaryRange = parseRange(params.salary);
    if (salaryRange) {
      const salaryMax = salaryRange.max ?? 1000;
      andClauses.push({
          AND: [
            { salaryMin: { lte: salaryMax } },
            {
              OR: [
                { salaryMax: null },
                { salaryMax: { gte: salaryRange.min } },
              ],
            },
          ],
        });
    }
  }

  if (params.workMode) {
    where.workMode = params.workMode;
  }

  if (params.jobType) {
    where.type = params.jobType;
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  return where as Prisma.JobWhereInput;
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export function calculateMatchSummary(
  candidateSkills: string[],
  requiredSkills: string[]
): MatchSummary {
  if (requiredSkills.length === 0) {
    return {
      matchScore: 100,
      readiness: 100,
      missingSkills: [],
    };
  }

  const candidateSet = new Set(candidateSkills.map(normalizeSkill));
  const missingSkills = requiredSkills.filter(
    (skill) => !candidateSet.has(normalizeSkill(skill))
  );

  const matchedCount = requiredSkills.length - missingSkills.length;
  const score = Math.round((matchedCount / requiredSkills.length) * 100);

  return {
    matchScore: score,
    readiness: score,
    missingSkills,
  };
}

export function formatPostedAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Posted just now";
  if (hours < 24) return `Posted ${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Posted yesterday";
  return `Posted ${days} days ago`;
}
