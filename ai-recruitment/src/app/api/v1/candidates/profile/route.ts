import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { CandidateProfileSchema } from "@/lib/validators/candidate.schema";
import { prisma } from "@/lib/db";
import { enqueueRecommendationUpdate, enqueueAnalyticsUpdate } from "@/services/queue-producers";
import {
  FULL_PROFILE_SELECT,
  getCachedCandidateProfile,
  invalidateCandidateProfileCache,
} from "@/services/profile/profile.service";
import { calculateCompleteness } from "@/services/profile/completeness.service";

// ─── User fields that live on the User model (not Candidate) ─────────────────

const USER_FIELDS = new Set([
  "linkedInUrl",
  "githubUrl",
  "websiteUrl",
  "jobAlerts",
  "aiSuggestions",
  "publicProfile",
]);

function splitFields(data: Record<string, unknown>) {
  const userFields: Record<string, unknown> = {};
  const candidateFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (USER_FIELDS.has(key)) {
      userFields[key] = value;
    } else {
      candidateFields[key] = value;
    }
  }

  return { userFields, candidateFields };
}

// ─── GET /api/v1/candidates/profile ──────────────────────────────────────────
//
// Delegates entirely to getCachedCandidateProfile:
//   • Redis cache-first (TTL 600 s)
//   • Single Prisma query joining all 10 relations on cache miss
//   • Structured CACHE HIT / CACHE MISS / DATABASE FETCH logging

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const userEmail = authedReq.user!.email;
    const profile = await getCachedCandidateProfile(userEmail);
    return NextResponse.json(profile);
  });
}

// ─── PATCH /api/v1/candidates/profile ────────────────────────────────────────
//
// Optimised from ~9 sequential queries to 5:
//   1. findFirst    – resolve candidate id
//   2. update/create candidate scalars  (upsert path)
//   3. update user fields (only User-model fields forwarded)
//   4. batch replace educations + skills (deleteMany + createMany each)
//   5. update completeness score and return full profile (single round-trip)
//
// Completeness is computed in-memory from the new input data — no extra SELECT.

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const userEmail = authedReq.user!.email;

    try {
      const body = await req.json();
      const { educations, skillRecords, ...rest } = CandidateProfileSchema.parse(body);

      const { userFields, candidateFields } = splitFields(
        rest as Record<string, unknown>
      );

      const result = await prisma.$transaction(async (tx) => {
        // ── 1. Resolve (or create) the candidate row ──────────────────────────
        let candidate = await tx.candidate.findFirst({
          where: { email: userEmail },
          select: { id: true, userId: true },
        });

        if (!candidate) {
          const user =
            (await tx.user.findUnique({ where: { email: userEmail }, select: { id: true } })) ??
            (await tx.user.create({ data: { email: userEmail, name: candidateFields.name as string ?? "Unknown" } }));

          candidate = await tx.candidate.create({
            data: {
              userId:  user.id,
              email:   userEmail,
              name:    (candidateFields.name as string) ?? "Unknown",
              ...candidateFields,
            },
            select: { id: true, userId: true },
          });
        } else {
          // ── 2a. Update candidate scalars ────────────────────────────────────
          if (Object.keys(candidateFields).length) {
            await tx.candidate.update({
              where: { id: candidate.id },
              data:  candidateFields,
            });
          }
        }

        // ── 2b. Update user-model fields ────────────────────────────────────
        if (Object.keys(userFields).length) {
          await tx.user.update({
            where: { email: userEmail },
            data:  userFields,
          });
        }

        // ── 3. Batch-replace educations ──────────────────────────────────────
        if (educations !== undefined) {
          await tx.education.deleteMany({ where: { candidateId: candidate.id } });
          if (educations.length > 0) {
            await tx.education.createMany({
              data: educations.map((edu, i) => ({
                candidateId: candidate!.id,
                school:      edu.school,
                degree:      edu.degree,
                field:       edu.field,
                startYear:   edu.startYear,
                endYear:     edu.endYear,
                order:       i,
              })),
            });
          }
        }

        // ── 4. Batch-replace skills ──────────────────────────────────────────
        if (skillRecords !== undefined) {
          await tx.skill.deleteMany({ where: { candidateId: candidate.id } });
          if (skillRecords.length > 0) {
            await tx.skill.createMany({
              data: skillRecords.map((s) => ({
                candidateId: candidate!.id,
                name:        s.name,
                level:       (s.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT") ?? "INTERMEDIATE",
              })),
            });
          }
        }

        // ── 5. Compute completeness (in-memory) and write with full-profile
        //       return — single final query ───────────────────────────────────
        const fresh = await tx.candidate.findUnique({
          where:  { id: candidate.id },
          select: FULL_PROFILE_SELECT,
        });

        const { score } = calculateCompleteness({
          name:            fresh?.name,
          headline:        fresh?.headline,
          resumeUrl:       fresh?.resumeUrl,
          educations:      fresh?.educations,
          skillRecords:    fresh?.skillRecords,
          experiences:     fresh?.experiences,
          projects:        fresh?.projects,
          careerPreference:fresh?.careerPreference,
        });

        const updated = await tx.candidate.update({
          where:  { id: candidate.id },
          data:   { profileCompleteness: score },
          select: FULL_PROFILE_SELECT,
        });

        return updated;
      });

      // ── Invalidate profile cache ─────────────────────────────────────────
      await invalidateCandidateProfileCache(userEmail);

      // ── Trigger background jobs (fire-and-forget) ────────────────────────
      void enqueueRecommendationUpdate(result.id);
      void enqueueAnalyticsUpdate(result.id);

      const response = { ...result.user, ...result };
      return NextResponse.json(response);
    } catch (error: unknown) {
      console.error("[PATCH /api/v1/candidates/profile]", error);
      const msg = error instanceof Error ? error.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
