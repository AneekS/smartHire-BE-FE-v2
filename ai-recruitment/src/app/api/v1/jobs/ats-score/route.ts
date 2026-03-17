import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { requireAuth } from "@/lib/insforge-server";
import { insforge } from "@/lib/insforge";
import { prisma } from "@/lib/db";
import { buildJobATSPrompt } from "@/lib/prompts/jobATSPrompt";

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user, client } = await requireAuth();
    const body = await req.json();
    const { jobTitle, companyName = "", jobDescription } = body ?? {};

    if (!jobTitle?.trim()) return err("jobTitle is required", 400);
    if (!jobDescription?.trim()) return err("jobDescription is required", 400);
    if (jobDescription.trim().length < 100) {
      return err(
        "Job description is too short. Paste the full JD for accurate scoring.",
        400
      );
    }

    console.log("[job-ats] Request:", {
      jobTitle,
      companyName,
      userId: user.id,
    });

    // Lookup candidate and latest resumeVersion for this user
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email ?? undefined },
      include: { resumeVersions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!dbUser) {
      return err(
        "User profile not fully synced in DB. Please sign in again.",
        400
      );
    }

    const latestResume = dbUser.resumeVersions[0];
    if (!latestResume) {
      return err(
        "No resume found. Please upload your resume in Resume Optimizer first.",
        404
      );
    }

    const parsed =
      (latestResume.parsedContent &&
        (JSON.parse(latestResume.parsedContent) as any)) ||
      null;
    if (!parsed) {
      return err(
        "Resume not yet parsed. Please re-upload your resume in Resume Optimizer.",
        404
      );
    }

    const resumeText =
      (await prisma.resumeRaw.findFirst({
        where: { profile: { candidate: { userId: dbUser.id } } },
        orderBy: { uploadedAt: "desc" },
      }))?.extractedText ?? "";

    console.log("[job-ats] Resume loaded:", {
      textLength: resumeText.length,
      hasParsed: !!parsed,
    });

    // STEP 1: Cache check via InsForge (job_ats_scores)
    const jdHash = createHash("md5").update(jobDescription.trim()).digest("hex");

    const { data: cached } = await client.database
      .from("job_ats_scores")
      .select("*")
      .eq("candidate_id", dbUser.id)
      .eq("job_description_hash", jdHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      console.log("[job-ats] Returning cached score");
      return ok({ ...mapScoreRow(cached), cached: true });
    }

    // STEP 2: Call AI via InsForge (uses openai/gpt-4o-mini; no OPENAI_API_KEY needed)
    const prompt = buildJobATSPrompt(
      resumeText,
      parsed,
      jobTitle,
      companyName,
      jobDescription
    );

    console.log("[job-ats] Calling AI...");

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content:
            "You are a precise ATS scoring engine and senior technical recruiter. Be strict, accurate, and specific. Return only valid JSON. Zero markdown.",
        },
        { role: "user", content: prompt },
      ],
    });

    console.log("[job-ats] Token usage:", completion.usage);

    const raw = completion.choices[0].message.content ?? "";
    const clean = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let analysis: any;
    try {
      analysis = JSON.parse(clean);
    } catch (e) {
      console.error("[job-ats] JSON parse failed:", raw.substring(0, 400));
      return err("AI returned invalid JSON. Please try again.", 500);
    }

    if (typeof analysis.overallScore !== "number") {
      return err("AI returned incomplete analysis. Please try again.", 500);
    }

    console.log("[job-ats] Score:", analysis.overallScore, "for", jobTitle);

    // STEP 3: Save to InsForge job_ats_scores (non-blocking on error)
    const { data: saved, error: saveErr } = await client.database
      .from("job_ats_scores")
      .insert({
        candidate_id: dbUser.id,
        resume_id: latestResume.id,
        job_title: jobTitle.trim(),
        company_name: companyName.trim() || null,
        job_description: jobDescription.trim(),
        job_description_hash: jdHash,
        overall_score: analysis.overallScore,
        breakdown: analysis.breakdown,
        keyword_analysis: analysis.keywordAnalysis,
        section_scores: analysis.sectionScores,
        recommendations: analysis.recommendations,
        match_summary: analysis.matchSummary,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("[job-ats] Save error (non-blocking):", saveErr);
    }

    return ok({
      id: saved?.id,
      jobTitle,
      companyName,
      ...analysis,
      cached: false,
      resumeFileName: latestResume.title,
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Scoring failed. Please try again.";
    console.error("[job-ats] Route error:", msg, error);
    return err(msg, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, client } = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email ?? undefined },
    });
    if (!dbUser) return ok([]);

    const { data, error } = await client.database
      .from("job_ats_scores")
      .select(
        `
        id, job_title, company_name, overall_score,
        match_summary, created_at, resume_id
      `
      )
      .eq("candidate_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return err(error.message, 500);

    const mapped = (data ?? []).map(mapScoreRow);
    return ok(mapped);
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Fetch failed. Please try again.";
    console.error("[job-ats] GET error:", msg, error);
    return err(msg, 500);
  }
}

function mapScoreRow(row: any) {
  return {
    id: row.id,
    jobTitle: row.job_title,
    companyName: row.company_name,
    overallScore: row.overall_score,
    breakdown: row.breakdown,
    keywordAnalysis: row.keyword_analysis,
    sectionScores: row.section_scores,
    recommendations: row.recommendations,
    matchSummary: row.match_summary,
    createdAt: row.created_at,
  };
}

