import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { uploadResume } from "@/lib/azure-storage";

export async function POST(req: Request) {
  try {
    const { dbUser } = await withAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const resumeVersionId = formData.get("resumeVersionId") as string | null;

    if (!file || !resumeVersionId) {
      return NextResponse.json(
        { error: "Missing file or resumeVersionId" },
        { status: 400 }
      );
    }

    const version = await prisma.resumeVersion.findFirst({
      where: { id: resumeVersionId, userId: dbUser.id },
      select: { id: true },
    });

    if (!version) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const blobPath = await uploadResume(
      dbUser.id,
      resumeVersionId,
      buffer,
      file.type || "application/pdf"
    );

    const updated = await prisma.resumeVersion.update({
      where: { id: resumeVersionId },
      data: { filePath: blobPath },
    });

    return NextResponse.json({
      id: updated.id,
      filePath: updated.filePath,
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
