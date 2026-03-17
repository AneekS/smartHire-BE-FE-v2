import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ExperienceLevel, SalaryVisibility, WorkType } from "@prisma/client";
import type {
  PreferencePayload,
  RecruiterFilterInput,
} from "@/modules/preferences/types/preferences.types";

const DEFAULT_PREFERENCE_PAYLOAD: PreferencePayload = {
  primaryRole: "",
  secondaryRoles: [],
  exploratoryRoles: [],
  experienceLevel: "MID",
  preferredIndustries: [],
  preferredWorkTypes: ["REMOTE"],
  preferredLocations: [],
  salaryMin: 0,
  salaryTarget: 0,
  salaryMax: 0,
  salaryVisibility: "RANGE_ONLY",
};

function mapPreferenceModel(row: {
  id: string;
  userId: string;
  primaryRole: string;
  secondaryRoles: string[];
  exploratoryRoles: string[];
  experienceLevel: ExperienceLevel;
  preferredIndustries: string[];
  preferredWorkTypes: WorkType[];
  preferredLocations: string[];
  salaryMin: number;
  salaryTarget: number;
  salaryMax: number;
  salaryVisibility: SalaryVisibility;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    primaryRole: row.primaryRole,
    secondaryRoles: row.secondaryRoles,
    exploratoryRoles: row.exploratoryRoles,
    experienceLevel: row.experienceLevel,
    preferredIndustries: row.preferredIndustries,
    preferredWorkTypes: row.preferredWorkTypes,
    preferredLocations: row.preferredLocations,
    salaryMin: row.salaryMin,
    salaryTarget: row.salaryTarget,
    salaryMax: row.salaryMax,
    salaryVisibility: row.salaryVisibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizePayload(payload: Partial<PreferencePayload>, base = DEFAULT_PREFERENCE_PAYLOAD): PreferencePayload {
  return {
    primaryRole: payload.primaryRole ?? base.primaryRole,
    secondaryRoles: payload.secondaryRoles ?? base.secondaryRoles,
    exploratoryRoles: payload.exploratoryRoles ?? base.exploratoryRoles,
    experienceLevel: payload.experienceLevel ?? base.experienceLevel,
    preferredIndustries: payload.preferredIndustries ?? base.preferredIndustries,
    preferredWorkTypes: payload.preferredWorkTypes ?? base.preferredWorkTypes,
    preferredLocations: payload.preferredLocations ?? base.preferredLocations,
    salaryMin: payload.salaryMin ?? base.salaryMin,
    salaryTarget: payload.salaryTarget ?? base.salaryTarget,
    salaryMax: payload.salaryMax ?? base.salaryMax,
    salaryVisibility: payload.salaryVisibility ?? base.salaryVisibility,
  };
}

function isMissingPreferenceTableError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

async function fetchPreferenceByUserId(userId: string) {
  try {
    const row = await prisma.userPreference.findUnique({ where: { userId } });
    if (!row) return null;
    return mapPreferenceModel(row);
  } catch (error) {
    if (isMissingPreferenceTableError(error)) {
      console.warn("[PREFERENCES] UserPreference table missing. Returning safe null.");
      return null;
    }
    throw error;
  }
}

export async function createUserPreference(userId: string, payload: PreferencePayload) {
  const normalized = normalizePayload(payload, DEFAULT_PREFERENCE_PAYLOAD);

  try {
    const row = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        primaryRole: normalized.primaryRole,
        secondaryRoles: normalized.secondaryRoles,
        exploratoryRoles: normalized.exploratoryRoles,
        experienceLevel: normalized.experienceLevel,
        preferredIndustries: normalized.preferredIndustries,
        preferredWorkTypes: normalized.preferredWorkTypes,
        preferredLocations: normalized.preferredLocations,
        salaryMin: normalized.salaryMin,
        salaryTarget: normalized.salaryTarget,
        salaryMax: normalized.salaryMax,
        salaryVisibility: normalized.salaryVisibility,
      },
      create: {
        userId,
        primaryRole: normalized.primaryRole,
        secondaryRoles: normalized.secondaryRoles,
        exploratoryRoles: normalized.exploratoryRoles,
        experienceLevel: normalized.experienceLevel,
        preferredIndustries: normalized.preferredIndustries,
        preferredWorkTypes: normalized.preferredWorkTypes,
        preferredLocations: normalized.preferredLocations,
        salaryMin: normalized.salaryMin,
        salaryTarget: normalized.salaryTarget,
        salaryMax: normalized.salaryMax,
        salaryVisibility: normalized.salaryVisibility,
      },
    });

    return mapPreferenceModel(row);
  } catch (error) {
    if (isMissingPreferenceTableError(error)) {
      console.warn("[PREFERENCES] UserPreference table missing. Returning safe null from upsert.");
      return null;
    }
    throw error;
  }
}

export async function updateUserPreference(userId: string, payload: Partial<PreferencePayload>) {
  const current = await fetchPreferenceByUserId(userId);
  const merged = normalizePayload(payload, current ?? DEFAULT_PREFERENCE_PAYLOAD);
  return createUserPreference(userId, merged);
}

export async function getUserPreference(userId: string) {
  return fetchPreferenceByUserId(userId);
}

export async function getPreferenceListPaginated(page = 1, limit = 20) {
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;

  let items: Array<{
    id: string;
    userId: string;
    primaryRole: string;
    experienceLevel: ExperienceLevel;
    salaryMin: number;
    salaryTarget: number;
    salaryMax: number;
    preferredWorkTypes: WorkType[];
    preferredIndustries: string[];
    updatedAt: Date;
    user: { name: string | null; email: string };
  }> = [];
  let total = 0;

  try {
    [items, total] = await Promise.all([
      prisma.userPreference.findMany({
        orderBy: { updatedAt: "desc" },
        skip,
        take,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.userPreference.count(),
    ]);
  } catch (error) {
    if (!isMissingPreferenceTableError(error)) throw error;
    console.warn("[PREFERENCES] UserPreference table missing. Returning empty paginated list.");
  }

  return {
    items: items.map((item) => ({
      id: item.id,
      userId: item.userId,
      primaryRole: item.primaryRole,
      experienceLevel: item.experienceLevel,
      salaryMin: item.salaryMin,
      salaryTarget: item.salaryTarget,
      salaryMax: item.salaryMax,
      preferredWorkTypes: item.preferredWorkTypes,
      preferredIndustries: item.preferredIndustries,
      updatedAt: item.updatedAt,
      userName: item.user.name,
      userEmail: item.user.email,
    })),
    page,
    limit: take,
    total,
    hasMore: skip + take < total,
  };
}

export async function filterCandidatesForRecruiter(input: RecruiterFilterInput) {
  const page = Math.max(input.page ?? 1, 1);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);

  const preferredRole = input.preferredRole?.trim();
  const where = {
    AND: [
      preferredRole
        ? {
            OR: [
              { primaryRole: { contains: preferredRole, mode: "insensitive" as const } },
              { secondaryRoles: { has: preferredRole } },
              { exploratoryRoles: { has: preferredRole } },
            ],
          }
        : {},
      input.salaryMin
        ? { salaryMax: { gte: input.salaryMin } }
        : {},
      input.salaryMax
        ? { salaryMin: { lte: input.salaryMax } }
        : {},
      input.experienceLevel
        ? { experienceLevel: input.experienceLevel }
        : {},
      input.workType
        ? { preferredWorkTypes: { has: input.workType } }
        : {},
      input.industryPreference
        ? { preferredIndustries: { has: input.industryPreference } }
        : {},
    ],
  };

  let rows: Array<{
    id: string;
    userId: string;
    primaryRole: string;
    secondaryRoles: string[];
    experienceLevel: ExperienceLevel;
    preferredWorkTypes: WorkType[];
    preferredIndustries: string[];
    salaryMin: number;
    salaryTarget: number;
    salaryMax: number;
    user: {
      name: string | null;
      email: string;
      candidate: {
        id: string;
        location: string | null;
        skills: string[];
        aiScore: number | null;
      } | null;
    };
  }> = [];
  let total = 0;

  try {
    [rows, total] = await Promise.all([
      prisma.userPreference.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              candidate: {
                select: {
                  id: true,
                  location: true,
                  skills: true,
                  aiScore: true,
                },
              },
            },
          },
        },
      }),
      prisma.userPreference.count({ where }),
    ]);
  } catch (error) {
    if (!isMissingPreferenceTableError(error)) throw error;
    console.warn("[PREFERENCES] UserPreference table missing. Returning empty recruiter filter list.");
  }

  return {
    items: rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      primaryRole: p.primaryRole,
      secondaryRoles: p.secondaryRoles,
      experienceLevel: p.experienceLevel,
      preferredWorkTypes: p.preferredWorkTypes,
      preferredIndustries: p.preferredIndustries,
      salaryMin: p.salaryMin,
      salaryTarget: p.salaryTarget,
      salaryMax: p.salaryMax,
      userName: p.user.name,
      userEmail: p.user.email,
      candidateId: p.user.candidate?.id ?? null,
      candidateLocation: p.user.candidate?.location ?? null,
      candidateSkills: p.user.candidate?.skills ?? [],
      candidateAiScore: p.user.candidate?.aiScore ?? null,
    })),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
