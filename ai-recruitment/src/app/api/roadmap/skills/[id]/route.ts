import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  currentLevel: z.number().int().min(0).max(100).optional(),
  targetLevel: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth();
    const { id } = await params;

    const existing = await prisma.skillGoal.findFirst({
      where: { id, userId: dbUser.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.currentLevel !== undefined)
      updateData.currentLevel = data.currentLevel;
    if (data.targetLevel !== undefined)
      updateData.targetLevel = data.targetLevel;

    const skill = await prisma.skillGoal.update({
      where: { id },
      data: updateData,
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth();
    const { id } = await params;

    const existing = await prisma.skillGoal.findFirst({
      where: { id, userId: dbUser.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.skillGoal.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
