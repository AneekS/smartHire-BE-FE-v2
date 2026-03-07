import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getOrCreateCandidate } from "@/services/profile/profile.service";

// import { ExtractorService } from "@/services/resume/extractor.service";
// import { ParserService } from "@/services/resume/parser.service";
// import { ScorerService } from "@/services/resume/scorer.service";
// import { OptimizerService } from "@/services/resume/optimizer.service";

// const extractor = new ExtractorService();
// const parser = new ParserService();
// const scorer = new ScorerService();
// const optimizer = new OptimizerService();

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "resumes");

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const formData = await req.formData();
      const file = formData.get("resume") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Get or create the candidate profile correctly using Prisma
      const candidate = await getOrCreateCandidate(authedReq.user!.email);

      await mkdir(UPLOAD_DIR, { recursive: true });
      const filename = `${candidate.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const dest = path.join(UPLOAD_DIR, filename);
      await writeFile(dest, buffer);

      const fileUrl = `/uploads/resumes/${filename}`;

      // Deactivate all previous resumes
      await prisma.resumeVersion.updateMany({
        where: { userId: candidate.userId! },
        data: { status: "DRAFT" }
      });

      // Create new ResumeVersion
      const resume = await prisma.resumeVersion.create({
        data: {
          userId: candidate.userId!,
          title: file.name,
          fileUrl: fileUrl,
          status: "ACTIVE",
          atsScore: 75,
        }
      });

      // Simulate extraction/parsing since old services expect dropped supabase tables
      const parsed = {
        name: candidate.name,
        email: candidate.email,
        experience: [],
        education: [],
        skills: [],
      };

      const score = 75;
      const suggestionsCount = 0;

      return NextResponse.json(
        {
          resume: { id: resume.id, file_name: resume.title, created_at: resume.createdAt },
          parsed,
          ats_score: score,
          suggestions_count: suggestionsCount,
          message: "Resume uploaded successfully (Analysis simulated)",
        },
        { status: 201 }
      );
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Upload error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

