import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const applySchema = z.object({ suggestionIds: z.array(z.string()) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth();
    const { id } = await params;

    const version = await prisma.resumeVersion.findFirst({
      where: { id, userId: dbUser.id },
      select: { id: true },
    });

    if (!version) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { suggestionIds } = applySchema.parse(body);

    await prisma.resumeSuggestion.updateMany({
      where: {
        id: { in: suggestionIds },
        resumeVersionId: id,
      },
      data: { applied: true },
    });

    return NextResponse.json({ ok: true });
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
