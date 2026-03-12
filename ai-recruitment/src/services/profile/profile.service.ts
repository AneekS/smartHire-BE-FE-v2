/**
 * Profile Service
 * Central service for all candidate profile CRUD operations.
 * Orchestrates Prisma queries, completeness recalculation, and version snapshots.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { refreshCompleteness } from "./completeness.service";
import { safeQuery } from "@/lib/errors";
import { CacheService, CACHE_TTL_SECONDS } from "@/lib/cache-utils";
import type {
  BasicIdentityInput,
  EducationInput,
  ExperienceInput,
  SkillInput,
  ProjectInput,
  CertificationInput,
  CareerPreferenceInput,
  PrivacyInput,
} from "@/lib/validators/profile.schemas";

// ─── Full Profile Query ──────────────────────────────────────────────────────

export const FULL_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  headline: true,
  location: true,
  city: true,
  country: true,
  photoUrl: true,
  avatarUrl: true,
  summary: true,
  profileCompleteness: true,
  resumeUrl: true,
  availability: true,
  workAuthorization: true,
  openToFreelance: true,
  internshipInterest: true,
  languagesSpoken: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      image: true,
      linkedInUrl: true,
      githubUrl: true,
      websiteUrl: true,
      jobAlerts: true,
      aiSuggestions: true,
      publicProfile: true,
      reputationScore: true,
      technicalScore: true,
      softScore: true,
    },
  },
  educations: { orderBy: { order: "asc" as const } },
  skillRecords: { orderBy: { createdAt: "asc" as const } },
  experiences: { orderBy: { order: "asc" as const } },
  projects: { orderBy: { order: "asc" as const } },
  certifications: { orderBy: { createdAt: "asc" as const } },
  careerPreference: true,
  privacy: true,
  aiInsights: true,
  reputation: true,
} as const;

// ─── Get or create candidate by user email ────────────────────────────────────

export async function getOrCreateCandidate(userEmail: string) {
  return safeQuery(async () => {
    let candidate = await prisma.candidate.findUnique({
      where: { email: userEmail },
      select: FULL_PROFILE_SELECT,
    });

    if (!candidate) {
      let user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: { email: userEmail, name: "Unknown" }
        });
      }

      const created = await prisma.candidate.create({
        data: {
          userId: user.id,
          email: user.email,
          name: user.name || "Unknown",
        },
        select: FULL_PROFILE_SELECT,
      });
      candidate = created;
    }

    return candidate;
  }, "Candidate");
}

// ─── Identity ─────────────────────────────────────────────────────────────────

export async function updateIdentity(candidateId: string, data: BasicIdentityInput) {
  return safeQuery(async () => {
    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        name: data.name,
        headline: data.headline,
        phone: data.phone,
        location: data.location,
        city: data.city,
        country: data.country,
        photoUrl: data.photoUrl,
        summary: data.summary,
        availability: data.availability,
        workAuthorization: data.workAuthorization,
        openToFreelance: data.openToFreelance,
        internshipInterest: data.internshipInterest,
        languagesSpoken: data.languagesSpoken,
      },
      select: FULL_PROFILE_SELECT,
    });
    await refreshCompleteness(candidateId);
    return updated;
  }, "Candidate");
}

// ─── Education ────────────────────────────────────────────────────────────────

export async function addEducation(candidateId: string, data: EducationInput) {
  const education = await prisma.education.create({
    data: { candidateId, ...data },
  });
  await refreshCompleteness(candidateId);
  return education;
}

export async function updateEducation(id: string, candidateId: string, data: Partial<EducationInput>) {
  const education = await prisma.education.update({
    where: { id, candidateId },
    data,
  });
  await refreshCompleteness(candidateId);
  return education;
}

export async function deleteEducation(id: string, candidateId: string) {
  await prisma.education.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

// ─── Experience ───────────────────────────────────────────────────────────────

export async function addExperience(candidateId: string, data: ExperienceInput) {
  const experience = await prisma.experience.create({
    data: {
      candidateId,
      company: data.company,
      jobTitle: data.jobTitle,
      employmentType: data.employmentType,
      location: data.location,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      isCurrent: data.isCurrent ?? false,
      description: data.description,
      achievements: data.achievements ?? [],
      technologies: data.technologies ?? [],
    },
  });
  await refreshCompleteness(candidateId);
  return experience;
}

export async function updateExperience(id: string, candidateId: string, data: Partial<ExperienceInput>) {
  const experience = await prisma.experience.update({
    where: { id, candidateId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : data.isCurrent ? null : undefined,
    },
  });
  await refreshCompleteness(candidateId);
  return experience;
}

export async function deleteExperience(id: string, candidateId: string) {
  await prisma.experience.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export async function addSkill(candidateId: string, data: SkillInput) {
  // Prevent duplicates (case-insensitive)
  const existing = await prisma.skill.findFirst({
    where: { candidateId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) return existing;

  const skill = await prisma.skill.create({ data: { candidateId, ...data } });
  await refreshCompleteness(candidateId);
  return skill;
}

export async function deleteSkill(id: string, candidateId: string) {
  await prisma.skill.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

export async function bulkUpsertSkills(candidateId: string, skills: SkillInput[]) {
  await prisma.$transaction([
    prisma.skill.deleteMany({ where: { candidateId } }),
    prisma.skill.createMany({
      data: skills.map((s) => ({ candidateId, ...s })),
    }),
  ]);
  await refreshCompleteness(candidateId);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function addProject(candidateId: string, data: ProjectInput) {
  const project = await prisma.project.create({
    data: {
      candidateId,
      title: data.title,
      description: data.description,
      technologies: data.technologies ?? [],
      repoUrl: data.repoUrl || null,
      demoUrl: data.demoUrl || null,
      teamRole: data.teamRole,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isCurrent: data.isCurrent ?? false,
    },
  });
  await refreshCompleteness(candidateId);
  return project;
}

export async function updateProject(id: string, candidateId: string, data: Partial<ProjectInput>) {
  const project = await prisma.project.update({
    where: { id, candidateId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  await refreshCompleteness(candidateId);
  return project;
}

export async function deleteProject(id: string, candidateId: string) {
  await prisma.project.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

// ─── Certifications ───────────────────────────────────────────────────────────

export async function addCertification(candidateId: string, data: CertificationInput) {
  return prisma.certification.create({
    data: {
      candidateId,
      name: data.name,
      issuer: data.issuer,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      credentialId: data.credentialId,
      credentialUrl: data.credentialUrl || null,
    },
  });
}

export async function updateCertification(id: string, candidateId: string, data: Partial<CertificationInput>) {
  return prisma.certification.update({
    where: { id, candidateId },
    data: {
      ...data,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    },
  });
}

export async function deleteCertification(id: string, candidateId: string) {
  await prisma.certification.delete({ where: { id, candidateId } });
}

// ─── Career Preferences ───────────────────────────────────────────────────────

export async function upsertCareerPreference(candidateId: string, data: CareerPreferenceInput) {
  const pref = await prisma.careerPreference.upsert({
    where: { candidateId },
    create: { candidateId, ...data },
    update: data,
  });
  await refreshCompleteness(candidateId);
  return pref;
}

// ─── Privacy ──────────────────────────────────────────────────────────────────

export async function upsertPrivacy(candidateId: string, data: PrivacyInput) {
  return prisma.profilePrivacy.upsert({
    where: { candidateId },
    create: { candidateId, ...data },
    update: data,
  });
}

// ─── Profile Version Snapshot ─────────────────────────────────────────────────

export async function snapshotProfile(candidateId: string, snapshot: object) {
  const last = await prisma.profileVersion.findFirst({
    where: { candidateId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  await prisma.profileVersion.create({
    data: {
      candidateId,
      version: (last?.version ?? 0) + 1,
      snapshot: snapshot as never,
    },
  });
}

// ─── Typed profile payload ────────────────────────────────────────────────────

/** Exact shape Prisma returns for a full candidate fetch with FULL_PROFILE_SELECT. */
export type FullCandidateProfile = Prisma.CandidateGetPayload<{
  select: typeof FULL_PROFILE_SELECT;
}>;

/**
 * API-level response: flattened User fields merged under the candidate root so
 * consumers can access `linkedInUrl`, `image`, etc. without traversing `.user`.
 * When both models share a key (e.g. `id`, `email`), the Candidate value wins
 * because the spread order is `{ ...candidate.user, ...candidate }`.
 */
export type CandidateProfileResponse = Omit<FullCandidateProfile, "user"> &
  Partial<NonNullable<FullCandidateProfile["user"]>> & {
    user: FullCandidateProfile["user"];
  };

// ─── Cache-first profile fetch ────────────────────────────────────────────────

const PROFILE_CACHE_KEY = (email: string): string =>
  `candidate-profile:${email}`;

/**
 * Cache-first candidate profile fetch.
 *
 * Flow:
 *   1. [CACHE HIT]      Return serialized profile from Redis immediately.
 *   2. [CACHE MISS]     Proceed to database.
 *   3. [DATABASE FETCH] Single round-trip via FULL_PROFILE_SELECT (10 relations).
 *   4.                  Populate Redis with TTL = 600 s.
 *
 * Redis errors are swallowed by CacheService — the API always returns data.
 */
export async function getCachedCandidateProfile(
  userEmail: string
): Promise<CandidateProfileResponse> {
  const cacheKey = PROFILE_CACHE_KEY(userEmail);

  // ── 1. Cache-first ────────────────────────────────────────────────────────
  const cached = await CacheService.get<CandidateProfileResponse>(cacheKey);
  if (cached) {
    console.log(`[CACHE HIT]       key=${cacheKey}`);
    return cached;
  }

  console.log(`[CACHE MISS]      key=${cacheKey}`);

  // ── 2. Single database round-trip (all 10 relations in one query) ─────────
  console.log(`[DATABASE FETCH]  candidate email=${userEmail}`);
  const candidate = await getOrCreateCandidate(userEmail);

  // Flatten user fields onto root; Candidate fields take precedence on conflict
  const response = {
    ...candidate.user,
    ...candidate,
  } as CandidateProfileResponse;

  // ── 3. Populate Redis (fire-and-forget; errors logged by CacheService) ────
  void CacheService.set(cacheKey, response, CACHE_TTL_SECONDS);

  return response;
}

/**
 * Invalidate the Redis cache entry for a candidate profile.
 * Call after any write operation that mutates profile data.
 */
export async function invalidateCandidateProfileCache(
  userEmail: string
): Promise<void> {
  const cacheKey = PROFILE_CACHE_KEY(userEmail);
  console.log(`[CACHE INVALIDATE] key=${cacheKey}`);
  await CacheService.del(cacheKey);
}
