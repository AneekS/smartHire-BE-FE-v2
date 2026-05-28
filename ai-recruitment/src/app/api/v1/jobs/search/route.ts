import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { JobSearchSchema } from "@/lib/validators/job.schema";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams);
    const { role, location, skills, experience, limit } =
      JobSearchSchema.parse(params);
    const page = 1;

    const conditions: Prisma.JobWhereInput[] = [];

    if (role) {
      conditions.push({ title: { contains: role, mode: "insensitive" } });
    }
    if (location) {
      conditions.push({
        OR: [
          { location: { contains: location, mode: "insensitive" } },
          { workMode: "REMOTE" },
        ],
      });
    }
    if (experience) {
      conditions.push({ experienceMin: { lte: parseFloat(experience) } });
    }
    if (skills) {
      const skillArr = skills.split(",").map((s) => s.trim());
      if (skillArr.length > 0) {
        conditions.push({ requiredSkills: { hasSome: skillArr } });
      }
    }

    const where: Prisma.JobWhereInput = {
      status: "ACTIVE",
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({ jobs, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
