import { NextResponse, NextRequest } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  runResumePipeline,
  deleteUserResume,
} from "@/pipeline/resume-pipeline";
import { getOrCreateCandidate } from "@/services/profile/profile.service";

export async function GET() {
  try {
    const { dbUser } = await withAuth();

    const resume = await prisma.resumeVersion.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    if (!resume) return NextResponse.json({ data: null });

    const parsed = resume.parsedContent
      ? (JSON.parse(resume.parsedContent) as Record<string, unknown>)
      : null;
    if (parsed && !Array.isArray(parsed.projects)) {
      parsed.projects = [];
    }

    return NextResponse.json({
      data: {
        resumeId: resume.id,
        fileName: resume.title,
        uploadedAt: resume.createdAt.toISOString(),
        parsed,
        atsScore: resume.atsScore,
        scoreBreakdown: resume.scoreBreakdown
          ? JSON.parse(resume.scoreBreakdown)
          : null,
        improvements: resume.improvements
          ? JSON.parse(resume.improvements)
          : [],
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/resume error:", e);
    const message = e instanceof Error ? e.message : "Server error";
    const isTimeout =
      message.includes("timeout") || message.includes("P1008");
    return NextResponse.json(
      { error: isTimeout ? "Database connection timed out" : message },
      { status: isTimeout ? 503 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { dbUser } = await withAuth();

    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File;
    if (!file) {
      return NextResponse.json(
        { error: "Missing resume file" },
        { status: 400 }
      );
    }

    const candidate = await getOrCreateCandidate(dbUser.email);
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await runResumePipeline({
      userId: dbUser.id,
      candidateId: candidate.id,
      fileName: file.name,
      buffer,
      mimeType: file.type || "application/pdf",
    });

    return NextResponse.json({
      data: {
        resumeId: result.resumeId,
        fileName: result.fileName,
        uploadedAt: result.uploadedAt,
        parsed: result.parsed,
        atsScore: result.atsScore,
        scoreBreakdown: result.scoreBreakdown,
        improvements: result.improvements,
      },
    });
  } catch (e: unknown) {
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

export async function DELETE() {
  try {
    const { dbUser } = await withAuth();
    await deleteUserResume(dbUser.id);
    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/resume error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
