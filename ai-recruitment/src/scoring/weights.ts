import type { JobSchemaType } from "@/models/job.schema";
import type { ScoreComponentKey } from "@/models/scoring.schema";
import { GLOBAL_TENANT_ID, type FractionWeightProfile } from "@/feedback/types";
import { fractionsToWeights } from "@/feedback/stats";

export interface WeightProfile {
  semanticMatch: number;
  skillMatch: number;
  experienceMatch: number;
  seniorityBand: number;
  educationMatch: number;
  achievementScore: number;
}

export const WEIGHT_PROFILES: Record<
  "IC" | "MANAGER" | "EXECUTIVE" | "SALES" | "HEALTHCARE",
  WeightProfile
> = {
  IC: {
    semanticMatch: 25,
    skillMatch: 30,
    experienceMatch: 20,
    seniorityBand: 10,
    educationMatch: 5,
    achievementScore: 10,
  },
  MANAGER: {
    semanticMatch: 20,
    skillMatch: 20,
    experienceMatch: 25,
    seniorityBand: 15,
    educationMatch: 5,
    achievementScore: 10,
  },
  EXECUTIVE: {
    semanticMatch: 15,
    skillMatch: 10,
    experienceMatch: 20,
    seniorityBand: 20,
    educationMatch: 10,
    achievementScore: 15,
  },
  SALES: {
    semanticMatch: 20,
    skillMatch: 20,
    experienceMatch: 25,
    seniorityBand: 10,
    educationMatch: 5,
    achievementScore: 15,
  },
  HEALTHCARE: {
    semanticMatch: 20,
    skillMatch: 25,
    experienceMatch: 25,
    seniorityBand: 10,
    educationMatch: 10,
    achievementScore: 5,
  },
};

export function getWeightProfile(jd: JobSchemaType): WeightProfile {
  const roleType = jd.roleType ?? "IC";
  if (roleType in WEIGHT_PROFILES) {
    return WEIGHT_PROFILES[roleType as keyof typeof WEIGHT_PROFILES];
  }
  return WEIGHT_PROFILES.IC;
}

export async function getWeightProfileForTenant(
  jd: JobSchemaType,
  tenantId?: string
): Promise<WeightProfile> {
  const roleType = jd.roleType ?? "IC";
  const resolvedTenant = tenantId?.trim() || GLOBAL_TENANT_ID;

  try {
    const { prisma } = await import("@/lib/db");
    const tenantRow =
      resolvedTenant !== GLOBAL_TENANT_ID
        ? await prisma.tenantWeightProfile.findUnique({
            where: {
              tenantId_roleType: { tenantId: resolvedTenant, roleType },
            },
          })
        : null;

    const row =
      tenantRow ??
      (await prisma.tenantWeightProfile.findUnique({
        where: {
          tenantId_roleType: { tenantId: GLOBAL_TENANT_ID, roleType },
        },
      }));

    if (row?.weights && typeof row.weights === "object") {
      return fractionsToWeights(row.weights as FractionWeightProfile) as WeightProfile;
    }
  } catch {
    /* DB unavailable — use static profiles */
  }

  return getWeightProfile(jd);
}

export function weightedOverall(
  components: Partial<Record<ScoreComponentKey, number>>,
  weights: WeightProfile
): number {
  let sum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(weights) as ScoreComponentKey[]) {
    const score = components[key];
    if (score == null) continue;
    const w = weights[key];
    sum += score * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return Math.round(sum / totalWeight);
}

export const RRF_K = 60;

/** Section multipliers for semantic scoring (from chunker). */
export const SEMANTIC_SECTION_WEIGHTS: Record<string, number> = {
  EXPERIENCE_RECENT: 1.0,
  SKILLS: 0.85,
  ACHIEVEMENTS: 0.75,
  SUMMARY: 0.6,
  FULL_TEXT: 0.5,
  EDUCATION: 0.4,
  EXPERIENCE_ALL: 0.35,
};

export const SKILL_DOMAIN_MULTIPLIER: Record<string, number> = {
  DATA_AI: 1.3,
  DEVOPS: 1.2,
  FRONTEND: 1.15,
  BACKEND: 1.0,
};
