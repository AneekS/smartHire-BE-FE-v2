import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
});

const skillSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  currentLevel: z.number().int().min(0).max(100).optional(),
  targetLevel: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  try {
    const { dbUser } = await withAuth();

    const [milestones, skills] = await Promise.all([
      prisma.careerMilestone.findMany({
        where: { userId: dbUser.id },
        orderBy: { order: "asc" },
      }),
      prisma.skillGoal.findMany({
        where: { userId: dbUser.id },
      }),
    ]);

    return NextResponse.json({
      milestones: milestones.map((m) => ({
        id: m.id,
        userId: m.userId,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate?.toISOString() ?? null,
        completed: m.completed,
        order: m.order,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      skills: skills.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.name,
        category: s.category,
        currentLevel: s.currentLevel,
        targetLevel: s.targetLevel,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { dbUser } = await withAuth();
    const body = await req.json();

    if (body.type === "milestone") {
      const data = milestoneSchema.parse(body);
      const existing = await prisma.careerMilestone.findMany({
        where: { userId: dbUser.id },
        select: { id: true },
      });
      const order = data.order ?? existing.length;

      const milestone = await prisma.careerMilestone.create({
        data: {
          userId: dbUser.id,
          title: data.title,
          description: data.description ?? null,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          completed: data.completed ?? false,
          order,
        },
      });

      return NextResponse.json({
        id: milestone.id,
        userId: milestone.userId,
        title: milestone.title,
        description: milestone.description,
        targetDate: milestone.targetDate?.toISOString() ?? null,
        completed: milestone.completed,
        order: milestone.order,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      });
    }

    if (body.type === "skill") {
      const data = skillSchema.parse(body);

      const skill = await prisma.skillGoal.create({
        data: {
          userId: dbUser.id,
          name: data.name,
          category: data.category ?? null,
          currentLevel: data.currentLevel ?? 0,
          targetLevel: data.targetLevel ?? 100,
        },
      });

      return NextResponse.json({
        id: skill.id,
        userId: skill.userId,
        name: skill.name,
        category: skill.category,
        currentLevel: skill.currentLevel,
        targetLevel: skill.targetLevel,
        createdAt: skill.createdAt.toISOString(),
        updatedAt: skill.updatedAt.toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
