import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { insforge } from "@/lib/insforge";
import { prisma } from "@/lib/db";
import { buildJobATSPrompt } from "@/lib/prompts/jobATSPrompt";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { dbUser } = await withAuth(req);
    const body = await req.json();
    const {
      job_listing_id: jobListingIdRaw,
      jobTitle: bodyTitle,
      companyName: bodyCompany = "",
      jobDescription: bodyDescription,
    } = body ?? {};

    let jobTitle = bodyTitle as string | undefined;
    let companyName = (bodyCompany as string) ?? "";
    let jobDescription = bodyDescription as string | undefined;
    let listingId: string | null =
      typeof jobListingIdRaw === "string" && jobListingIdRaw.trim()
        ? jobListingIdRaw.trim()
        : null;

    if (listingId) {
      const { data: listing, error: listingErr } = await insforge.database
        .from("job_listings")
        .select(
          "job_title, company_name, job_description, requirements, responsibilities, nice_to_have"
        )
        .eq("id", listingId)
        .eq("is_active", true)
        .maybeSingle();

      if (listingErr) return err(listingErr.message, 500);
      if (!listing) return err("Job listing not found", 404);

      const l = listing as {
        job_title: string;
        company_name: string;
        job_description: string;
        requirements: string;
        responsibilities: string;
        nice_to_have: string | null;
      };

      jobTitle = l.job_title;
      companyName = l.company_name ?? "";
      const nice = l.nice_to_have?.trim()
        ? `\n\nNICE TO HAVE:\n${l.nice_to_have.trim()}`
        : "";
      jobDescription = `${l.job_description}\n\nREQUIREMENTS:\n${l.requirements}\n\nRESPONSIBILITIES:\n${l.responsibilities}${nice}`;
    }

    if (!jobTitle?.trim()) return err("jobTitle is required", 400);
    if (!jobDescription?.trim()) return err("jobDescription is required", 400);
    if (jobDescription.trim().length < 100) {
      return err(
        "Job description is too short. Paste the full JD for accurate scoring.",
        400
      );
    }

    const latestResume = await prisma.resumeVersion.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    if (!latestResume) {
      return err(
        "No resume found. Please upload your resume in Resume Optimizer first.",
        404
      );
    }

    const parsed =
      (latestResume.parsedContent &&
        (JSON.parse(latestResume.parsedContent) as Record<string, unknown>)) ||
      null;
    if (!parsed) {
      return err(
        "Resume not yet parsed. Please re-upload your resume in Resume Optimizer.",
        404
      );
    }

    const resumeRaw = await prisma.resumeRaw.findFirst({
      where: { profile: { candidate: { userId: dbUser.id } } },
      orderBy: { uploadedAt: "desc" },
    });
    const resumeText = resumeRaw?.extractedText ?? "";

    // Cache: listing-scoped first, else JD hash (legacy)
    if (listingId) {
      const { data: cachedListing } = await insforge.database
        .from("job_ats_scores")
        .select("*")
        .eq("candidate_id", dbUser.id)
        .eq("job_listing_id", listingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedListing) {
        return ok({ ...mapScoreRow(cachedListing), cached: true });
      }
    }

    const jdHash = createHash("md5").update(jobDescription.trim()).digest("hex");

    if (!listingId) {
      const { data: cached } = await insforge.database
        .from("job_ats_scores")
        .select("*")
        .eq("candidate_id", dbUser.id)
        .eq("job_description_hash", jdHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return ok({ ...mapScoreRow(cached), cached: true });
      }
    }

    const prompt = buildJobATSPrompt(
      resumeText,
      parsed,
      jobTitle.trim(),
      companyName.trim(),
      jobDescription
    );

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 4000,
      messages: [
        {
          role: "system",
          content:
            "You are a precise ATS scoring engine and senior technical recruiter. Be strict, accurate, and specific. Return only valid JSON. Zero markdown.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content ?? "";
    const clean = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(clean) as Record<string, unknown>;
    } catch {
      return err("AI returned invalid JSON. Please try again.", 500);
    }

    if (typeof analysis.overallScore !== "number") {
      return err("AI returned incomplete analysis. Please try again.", 500);
    }

    const insertPayload: Record<string, unknown> = {
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
      score_label: analysis.scoreLabel ?? null,
      competitive_analysis: analysis.competitiveAnalysis ?? null,
      tailored_summary: analysis.tailoredSummary ?? null,
      top_missing_keywords: Array.isArray(analysis.topMissingKeywordsToAdd)
        ? analysis.topMissingKeywordsToAdd
        : null,
    };

    if (listingId) {
      insertPayload.job_listing_id = listingId;
    }

    const { data: saved, error: saveErr } = await insforge.database
      .from("job_ats_scores")
      .insert(insertPayload)
      .select()
      .single();

    if (saveErr) {
      console.error("[job-ats] Save error (non-blocking):", saveErr);
    }

    return ok({
      id: saved?.id,
      jobTitle,
      companyName,
      jobListingId: listingId,
      ...(analysis as Record<string, unknown>),
      cached: false,
      resumeFileName: latestResume.title,
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg =
      error instanceof Error ? error.message : "Scoring failed. Please try again.";
    console.error("[job-ats] Route error:", msg, error);
    return err(msg, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { dbUser } = await withAuth(req);
    const jobListingId = new URL(req.url).searchParams.get("job_listing_id");

    if (jobListingId?.trim()) {
      const { data, error } = await insforge.database
        .from("job_ats_scores")
        .select("*")
        .eq("candidate_id", dbUser.id)
        .eq("job_listing_id", jobListingId.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data) return err("Score not found", 404);

      const row = mapScoreRow(data);
      let resumeFileName: string | undefined;
      if (typeof data.resume_id === "string") {
        const rv = await prisma.resumeVersion.findUnique({
          where: { id: data.resume_id },
          select: { title: true },
        });
        resumeFileName = rv?.title;
      }
      return ok({ ...row, resumeFileName });
    }

    const { data, error } = await insforge.database
      .from("job_ats_scores")
      .select(
        `
        id, job_title, company_name, overall_score, score_label,
        match_summary, created_at, resume_id, job_listing_id
      `
      )
      .eq("candidate_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return err(error.message, 500);

    const mapped = (data ?? []).map((row) => ({
      id: row.id,
      jobTitle: row.job_title,
      companyName: row.company_name,
      overallScore: row.overall_score,
      scoreLabel: row.score_label ?? null,
      matchSummary: row.match_summary,
      createdAt: row.created_at,
      jobListingId: row.job_listing_id ?? null,
    }));
    return ok(mapped);
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg =
      error instanceof Error ? error.message : "Fetch failed. Please try again.";
    console.error("[job-ats] GET error:", msg, error);
    return err(msg, 500);
  }
}

function mapScoreRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    jobTitle: row.job_title,
    companyName: row.company_name,
    jobListingId: row.job_listing_id ?? null,
    overallScore: row.overall_score,
    scoreLabel: row.score_label ?? "Match",
    matchSummary: row.match_summary,
    breakdown: row.breakdown,
    keywordAnalysis: row.keyword_analysis,
    sectionScores: row.section_scores,
    recommendations: row.recommendations,
    competitiveAnalysis: row.competitive_analysis ?? null,
    tailoredSummary: row.tailored_summary ?? null,
    topMissingKeywordsToAdd: row.top_missing_keywords ?? [],
    createdAt: row.created_at,
  };
}
