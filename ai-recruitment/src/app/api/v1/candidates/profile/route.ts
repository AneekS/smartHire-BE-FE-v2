import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { CandidateProfileSchema } from "@/lib/validators/candidate.schema";
import { prisma } from "@/lib/db";

function calculateCompleteness(candidate: any) {
  let score = 0;
  if (candidate.name && candidate.name.trim().length > 0) score += 10;
  if (candidate.headline && candidate.headline.trim().length > 0) score += 10;
  if (candidate.summary && candidate.summary.trim().length > 0) score += 20;
  if (candidate.educations && candidate.educations.length > 0) score += 20;
  if (candidate.skillRecords && candidate.skillRecords.length > 0) score += 20;
  if (candidate.resumeUrl) score += 20;
  return Math.min(100, score);
}

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const userEmail = authedReq.user!.email;

    if (!userEmail) {
      return NextResponse.json({ error: "No email associated with session" }, { status: 400 });
    }

    try {
      const PROFILE_INCLUDE = {
        educations: { orderBy: { order: "asc" as const } },
        skillRecords: { orderBy: { createdAt: "asc" as const } },
        experiences: { orderBy: { order: "asc" as const } },
        projects: { orderBy: { order: "asc" as const } },
        certifications: { orderBy: { createdAt: "asc" as const } },
        careerPreference: true,
        privacy: true,
        aiInsights: true,
        reputation: true,
        user: true,
      } as const;

      let candidate = await prisma.candidate.findUnique({
        where: { email: userEmail },
        include: PROFILE_INCLUDE,
      });

      if (!candidate) {
        let user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!user) {
          user = await prisma.user.create({
            data: { email: userEmail, name: "Unknown" }
          });
        }
        candidate = await prisma.candidate.create({
          data: {
            userId: user.id,
            email: user.email,
            name: user.name || "Unknown",
            headline: user.headline,
            phone: user.phone,
            location: user.location,
          },
          include: PROFILE_INCLUDE,
        });
      }

      const combined = { ...candidate.user, ...candidate };
      return NextResponse.json(combined);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const userEmail = authedReq.user!.email;

    if (!userEmail) {
      return NextResponse.json({ error: "No email associated with session" }, { status: 400 });
    }

    try {
      const body = await req.json();
      const parsedData = CandidateProfileSchema.parse(body);

      const { educations, skillRecords, ...scalarUpdates } = parsedData;

      // Filter out undefined values
      const updateData = Object.fromEntries(
        Object.entries(scalarUpdates).filter(([_, v]) => v !== undefined)
      );

      const updatedCandidate = await prisma.$transaction(async (tx: any) => {
        let candidate = await tx.candidate.findUnique({
          where: { email: userEmail },
          include: { educations: true, skillRecords: true },
        });

        if (!candidate) {
          let user = await tx.user.findUnique({ where: { email: userEmail } });
          if (!user) {
            user = await tx.user.create({
              data: { email: userEmail, name: updateData.name || "Unknown" }
            });
          }
          candidate = await tx.candidate.create({
            data: {
              userId: user.id,
              email: user.email,
              name: updateData.name || user.name || "Unknown",
              ...updateData,
            },
            include: { educations: true, skillRecords: true }
          });
        } else {
          candidate = await tx.candidate.update({
            where: { email: userEmail },
            data: updateData,
            include: { educations: true, skillRecords: true },
          });

          await tx.user.update({
            where: { email: userEmail },
            data: updateData,
          });
        }

        if (educations) {
          await tx.education.deleteMany({ where: { candidateId: candidate.id } });
          if (educations.length > 0) {
            await tx.education.createMany({
              data: educations.map((edu) => ({
                candidateId: candidate!.id,
                school: edu.school,
                degree: edu.degree,
                field: edu.field,
                startYear: edu.startYear,
                endYear: edu.endYear,
              }))
            });
          }
        }

        if (skillRecords) {
          await tx.skill.deleteMany({ where: { candidateId: candidate.id } });
          if (skillRecords.length > 0) {
            await tx.skill.createMany({
              data: skillRecords.map((s) => ({
                candidateId: candidate!.id,
                name: s.name,
                level: s.level || "INTERMEDIATE",
              }))
            });
          }
        }

        const finalCandidate = await tx.candidate.findUnique({
          where: { id: candidate.id },
          include: { educations: true, skillRecords: true, user: true },
        });

        const completeness = calculateCompleteness(finalCandidate);

        const updated = await tx.candidate.update({
          where: { id: candidate.id },
          data: { profileCompleteness: completeness },
          include: { educations: true, skillRecords: true, user: true },
        });

        return updated;
      });

      const combined = { ...updatedCandidate.user, ...updatedCandidate };
      return NextResponse.json(combined);
    } catch (error: unknown) {
      console.error("API Error updating profile:", error);
      const msg = error instanceof Error ? error.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  });
}
