import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional().nullable(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth();
    const { id } = await params;

    const existing = await prisma.careerMilestone.findFirst({
      where: { id, userId: dbUser.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.targetDate !== undefined)
      updateData.targetDate = data.targetDate
        ? new Date(data.targetDate)
        : null;
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.order !== undefined) updateData.order = data.order;

    const milestone = await prisma.careerMilestone.update({
      where: { id },
      data: updateData,
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

    const existing = await prisma.careerMilestone.findFirst({
      where: { id, userId: dbUser.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.careerMilestone.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
