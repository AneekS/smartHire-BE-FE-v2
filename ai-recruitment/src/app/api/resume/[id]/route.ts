import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  roleTarget: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
  atsScore: z.number().int().min(0).max(100).optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).optional(),
});

function mapVersion(v: {
  id: string;
  userId: string;
  title: string;
  roleTarget: string | null;
  fileUrl: string | null;
  filePath: string | null;
  atsScore: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  suggestions: {
    id: string;
    resumeVersionId: string;
    type: string;
    section: string;
    title: string;
    description: string;
    applied: boolean;
    createdAt: Date;
  }[];
}) {
  return {
    id: v.id,
    userId: v.userId,
    title: v.title,
    roleTarget: v.roleTarget,
    fileUrl: v.fileUrl,
    fileKey: v.filePath,
    atsScore: v.atsScore,
    status: v.status,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    suggestions: v.suggestions.map((s) => ({
      id: s.id,
      resumeVersionId: s.resumeVersionId,
      type: s.type,
      section: s.section,
      title: s.title,
      description: s.description,
      applied: s.applied,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth();
    const { id } = await params;

    const version = await prisma.resumeVersion.findFirst({
      where: { id, userId: dbUser.id },
      include: { suggestions: true },
    });

    if (!version) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mapVersion(version));
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth();
    const { id } = await params;

    const existing = await prisma.resumeVersion.findFirst({
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
    if (data.roleTarget !== undefined) updateData.roleTarget = data.roleTarget;
    if (data.fileUrl !== undefined)
      updateData.fileUrl = data.fileUrl === "" ? null : data.fileUrl;
    if (data.atsScore !== undefined) updateData.atsScore = data.atsScore;
    if (data.status !== undefined) updateData.status = data.status;

    const version = await prisma.resumeVersion.update({
      where: { id },
      data: updateData,
      include: { suggestions: true },
    });

    return NextResponse.json(mapVersion(version));
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

    const existing = await prisma.resumeVersion.findFirst({
      where: { id, userId: dbUser.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.resumeVersion.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
