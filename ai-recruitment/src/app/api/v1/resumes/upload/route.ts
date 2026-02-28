import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { RESUMES_BUCKET } from "@/lib/insforge";
import { ExtractorService } from "@/services/resume/extractor.service";
import { ParserService } from "@/services/resume/parser.service";
import { ScorerService } from "@/services/resume/scorer.service";
import { OptimizerService } from "@/services/resume/optimizer.service";
import { requireAuth } from "@/lib/insforge-server";

const extractor = new ExtractorService();
const parser = new ParserService();
const scorer = new ScorerService();
const optimizer = new OptimizerService();

async function updateProfileCompletion(candidateId: string) {
  const { client } = await requireAuth();
  const { data: candidate } = await client.database
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();
  const { data: resume } = await client.database
    .from("resumes")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("is_active", true)
    .maybeSingle();

  let completion = 0;
  if (candidate?.name) completion += 10;
  if (candidate?.email || candidate?.phone) completion += 10;
  if (candidate?.location) completion += 5;
  if (candidate?.headline) completion += 10;
  if ((candidate?.preferred_roles ?? []).length > 0) completion += 10;
  if (candidate?.salary_expectation_min) completion += 5;
  if (resume) completion += 20;
  if (resume?.parse_status === "DONE") completion += 20;
  if (candidate?.avatar_url) completion += 10;

  await client.database
    .from("candidates")
    .update({
      profile_complete: completion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { client } = await requireAuth();

    // Ensure candidate row exists (e.g. user signed in but never had signup create the row)
    const { data: existingCandidate } = await client.database
      .from("candidates")
      .select("id")
      .eq("id", candidateId)
      .maybeSingle();

    if (!existingCandidate) {
      const user = authedReq.user as { name?: string; user_metadata?: { name?: string } };
      const name = user.name ?? user.user_metadata?.name ?? "Candidate";
      const { error: insertCandidateError } = await client.database
        .from("candidates")
        .insert({
          id: candidateId,
          email: authedReq.user!.email ?? null,
          name,
        });

      if (insertCandidateError) {
        return NextResponse.json(
          { error: "Profile not set up. Please complete signup or profile first." },
          { status: 400 }
        );
      }
    }

    const path = `${candidateId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { data: uploadData, error: storageError } = await client.storage
      .from(RESUMES_BUCKET)
      .upload(path, file);

    if (storageError || !uploadData) {
      return NextResponse.json(
        { error: storageError?.message ?? "Upload failed" },
        { status: 500 }
      );
    }

    const { data: existingResumes } = await client.database
      .from("resumes")
      .select("id")
      .eq("candidate_id", candidateId);

    await client.database
      .from("resumes")
      .update({ is_active: false })
      .eq("candidate_id", candidateId);

    const version = (existingResumes?.length ?? 0) + 1;
    const { data: resume, error: resumeError } = await client.database
      .from("resumes")
      .insert({
        candidate_id: candidateId,
        file_url: uploadData.url,
        file_name: file.name,
        file_type: file.type,
        file_size_kb: Math.round(file.size / 1024),
        version,
        parse_status: "PENDING",
      })
      .select()
      .single();

    if (resumeError || !resume) {
      return NextResponse.json(
        { error: resumeError?.message ?? "Resume create failed" },
        { status: 500 }
      );
    }

    const rawText = await extractor.extractText(buffer, file.type);
    const parsed = await parser.parse(rawText, resume.id, candidateId);
    const score = await scorer.computeBaseScore(resume.id, candidateId);
    const suggestions = await optimizer.generateSuggestions(
      resume.id,
      candidateId
    );
    await updateProfileCompletion(candidateId);

    return NextResponse.json(
      {
        resume,
        parsed,
        ats_score: score,
        suggestions_count: suggestions.length,
        message: "Resume uploaded and analyzed successfully",
      },
      { status: 201 }
    );
  });
}
