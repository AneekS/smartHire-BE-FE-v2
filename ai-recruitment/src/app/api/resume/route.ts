import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { ExtractorService } from "@/lib/services/ExtractorService";
import { ParserService } from "@/lib/services/ParserService";
import { prisma } from "@/lib/db";

const parser = new ParserService();

export async function GET() {
  try {
    const { user } = await requireAuth();

    if (!user?.email) return NextResponse.json({ error: "No user email found" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (!dbUser) {
      return NextResponse.json({ data: null });
    }

    const resume = await prisma.resumeVersion.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" }
    });

    if (!resume) return NextResponse.json({ data: null });

    return NextResponse.json({
      data: {
        resumeId: resume.id,
        fileName: resume.title,
        uploadedAt: resume.createdAt,
        parsed: resume.parsedContent ? JSON.parse(resume.parsedContent) : null,
        atsScore: resume.atsScore,
        scoreBreakdown: resume.scoreBreakdown ? JSON.parse(resume.scoreBreakdown) : null,
        improvements: resume.improvements ? JSON.parse(resume.improvements) : []
      }
    });

  } catch (e) {
    console.error("GET /api/resume error:", e);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    if (!user?.email) return NextResponse.json({ error: "No user email found in session" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not fully synced in DB. Please sign in again or set up profile." }, { status: 400 });
    }

    // Check if formData
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Must be multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File;
    if (!file) {
      return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
    }

    // 1. Extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`Processing file: ${file.name}, size: ${buffer.length} bytes, type: ${file.type}`);
    const rawText = await ExtractorService.extract(buffer, file.type);
    console.log(`Extracted ${rawText.length} characters from resume`);

    // 2. Parse with AI
    const parsed = await parser.parse(rawText);

    // 3. Generate Improvements
    const improvements = await parser.generateImprovements(parsed);

    // 4. Generate Mock Score
    const atsScore = Math.floor(Math.random() * 20) + 70; // 70-90
    const scoreBreakdown = {
      keywordMatch: atsScore + 5,
      formatting: atsScore - 10,
      experienceMatch: atsScore + 10,
      skillsAlignment: atsScore - 5
    };

    // 5. Deactivate old
    await prisma.resumeVersion.updateMany({
      where: { userId: dbUser.id, status: "ACTIVE" },
      data: { status: "DRAFT" }
    });

    console.log("INSERTING RESUME FOR DB_USER:", dbUser.id, " EMAIL:", dbUser.email);
    const usersCount = await prisma.user.count({ where: { id: dbUser.id } });
    console.log("DOES USER ACTUALLY EXIST IN PRISMA? Count:", usersCount);

    // 6. Save new
    const newVersion = await prisma.resumeVersion.create({
      data: {
        userId: dbUser.id,
        title: file.name,
        fileUrl: "/uploads/" + file.name,
        status: "ACTIVE",
        atsScore: atsScore,
        parsedContent: JSON.stringify(parsed),
        scoreBreakdown: JSON.stringify(scoreBreakdown),
        improvements: JSON.stringify(improvements)
      }
    });

    return NextResponse.json({
      data: {
        resumeId: newVersion.id,
        fileName: file.name,
        uploadedAt: newVersion.createdAt,
        parsed,
        atsScore,
        scoreBreakdown,
        improvements
      }
    });

  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed", stack: e.stack }, { status: 500 });
  }
}
