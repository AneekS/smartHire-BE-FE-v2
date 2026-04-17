import { NextRequest } from "next/server";
import { insforge } from "@/lib/insforge";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { buildSkillGapPrompt } from "@/lib/prompts/skillGapPrompt";

type ExperienceLevel = "entry" | "mid" | "senior" | "staff";

function inferRoleFromParsed(parsed: Record<string, unknown>): string {
  const exp = (parsed.experience ??
    parsed.work_experience ??
    []) as Record<string, unknown>[];
  const first = exp[0];
  const title = first?.title ?? first?.role;
  if (typeof title === "string" && title.trim()) return title.trim();
  const summary = parsed.summary;
  if (typeof summary === "string" && summary.trim().length > 10) {
    return "Software Engineer";
  }
  return "Software Engineer";
}

function parseJsonFromAiContent(raw: string): Record<string, unknown> {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const toParse = jsonMatch ? jsonMatch[0] : trimmed;
  return JSON.parse(toParse) as Record<string, unknown>;
}

function varyDemandScores(gaps: Record<string, unknown>[]) {
  if (gaps.length <= 1) return gaps;
  const scores = gaps.map((g) => Number((g as { demandScore?: number }).demandScore) || 0);
  const allSame = scores.every((s) => s === scores[0]);
  if (!allSame) {
    return [...gaps].sort(
      (a, b) =>
        (Number((b as { demandScore?: number }).demandScore) || 0) -
        (Number((a as { demandScore?: number }).demandScore) || 0)
    );
  }
  return gaps.map((gap, i) => ({
    ...gap,
    demandScore: Math.max(
      40,
      Math.min(99, scores[0] - i * 7 + (i % 2) * 4)
    ),
  })).sort(
    (a, b) =>
      (Number((b as { demandScore?: number }).demandScore) || 0) -
      (Number((a as { demandScore?: number }).demandScore) || 0)
  );
}

export async function POST(req: NextRequest) {
  try {
    const { dbUser } = await withAuth(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return err("Invalid JSON body", 400);
    }

    const body = (rawBody ?? {}) as Record<string, unknown>;

    let jobListingId: string | null = null;
    let targetRole: string | undefined;
    let experienceLevel: ExperienceLevel = "mid";
    let source: "resume" | "manual" | "job_listing" = "manual";

    if (typeof body.target_role === "string" && body.target_role.trim()) {
      targetRole = body.target_role.trim();
    } else {
      if (typeof body.job_listing_id === "string" && body.job_listing_id.trim()) {
        jobListingId = body.job_listing_id.trim();
      }
      if (typeof body.targetRole === "string" && body.targetRole.trim()) {
        targetRole = body.targetRole.trim();
      }
      const el = body.experienceLevel;
      if (
        el === "entry" ||
        el === "mid" ||
        el === "senior" ||
        el === "staff"
      ) {
        experienceLevel = el;
      }
      const src = body.source;
      if (src === "resume" || src === "manual" || src === "job_listing") {
        source = src;
      }
    }

    const latestResume = await prisma.resumeVersion.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    let parsedResume: Record<string, unknown> = {};
    if (latestResume?.parsedContent) {
      try {
        parsedResume = JSON.parse(latestResume.parsedContent) as Record<
          string,
          unknown
        >;
      } catch {
        parsedResume = {};
      }
    }

    const resumeRaw = await prisma.resumeRaw.findFirst({
      where: { profile: { candidate: { userId: dbUser.id } } },
      orderBy: { uploadedAt: "desc" },
    });
    const resumeRawText = resumeRaw?.extractedText ?? "";

    const skillCount = Array.isArray(parsedResume.skills)
      ? parsedResume.skills.length
      : 0;
    const expArr = (parsedResume.experience ??
      parsedResume.work_experience ??
      []) as unknown[];
    const projectArr = (parsedResume.projects ?? []) as unknown[];

    console.log("[skill-gap] Resume data:", {
      hasResume: !!latestResume?.parsedContent,
      fileName: latestResume?.title,
      skillCount,
      expCount: expArr.length,
      projectCount: projectArr.length,
    });

    if (skillCount === 0 && expArr.length === 0) {
      console.warn(
        "[skill-gap] Parsed resume has no skills or experience — analysis will use generic candidate branch"
      );
    }

    if (source === "resume") {
      if (!latestResume?.parsedContent) {
        return err(
          "Please upload and parse a resume first",
          400
        );
      }
    }

    let jobTitle = "";
    let companyName = "";
    let jobDescription = "";
    let requirements = "";
    let responsibilities = "";
    let experienceForPrompt: string = experienceLevel;

    if (jobListingId) {
      const { data: listing, error: listingErr } = await insforge.database
        .from("job_listings")
        .select(
          "id, job_title, company_name, experience_level, job_description, requirements, responsibilities, tech_stack"
        )
        .eq("id", jobListingId)
        .eq("is_active", true)
        .maybeSingle();

      if (listingErr) return err(listingErr.message, 500);
      if (!listing) return err("Job listing not found", 404);

      const L = listing as {
        job_title: string;
        company_name: string;
        experience_level: string | null;
        job_description: string;
        requirements: string;
        responsibilities: string;
        tech_stack: string[] | null;
      };

      jobTitle = L.job_title;
      companyName = L.company_name ?? "";
      jobDescription = L.job_description;
      requirements = L.requirements;
      responsibilities = L.responsibilities;
      if (L.experience_level?.trim()) {
        experienceForPrompt = L.experience_level.trim();
      }
      if (Array.isArray(L.tech_stack) && L.tech_stack.length > 0) {
        jobDescription += `\n\nTECH STACK (from posting): ${L.tech_stack.join(", ")}`;
      }
      if (source !== "resume") {
        source = "job_listing";
      }
    } else {
      if (!targetRole?.trim()) {
        if (source === "resume") {
          targetRole = inferRoleFromParsed(parsedResume);
        } else {
          return err("Either job_listing_id or targetRole is required", 400);
        }
      }
      jobTitle = targetRole!.trim();
      companyName = "Target role";
      jobDescription = `Target role: ${jobTitle}. Candidate-selected experience band: ${experienceLevel}.
Describe realistic day-to-day scope and context for this title at this level.`;
      requirements = `List concrete technical and soft-skill requirements typical for a ${jobTitle} at ${experienceLevel} level. Be specific enough to compare against a resume.`;
      responsibilities = `List concrete responsibilities typical for a ${jobTitle} at ${experienceLevel} level.`;
    }

    const cacheWindow = new Date(
      Date.now() - 12 * 60 * 60 * 1000
    ).toISOString();

    let cacheQuery = insforge.database
      .from("skill_gaps")
      .select("id, analysis, created_at, job_title")
      .eq("candidate_id", dbUser.id)
      .gte("created_at", cacheWindow)
      .order("created_at", { ascending: false })
      .limit(1);

    if (jobListingId) {
      cacheQuery = cacheQuery.eq("job_listing_id", jobListingId);
    } else {
      cacheQuery = cacheQuery
        .eq("target_role", jobTitle)
        .eq("experience_level", experienceLevel);
      cacheQuery = cacheQuery.is("job_listing_id", null);
    }

    const { data: cachedRow } = await cacheQuery.maybeSingle();

    const cachedAnalysis = cachedRow?.analysis as
      | Record<string, unknown>
      | null
      | undefined;
    if (
      cachedRow &&
      cachedAnalysis &&
      typeof cachedAnalysis === "object" &&
      typeof cachedAnalysis.roleMatchScore === "number"
    ) {
      console.log("[skill-gap] Cache hit");
      return ok({
        ...cachedAnalysis,
        cached: true,
        cachedAt: cachedRow.created_at,
        analysisId: cachedRow.id,
        resumeFileName: latestResume?.title ?? null,
        jobTitle,
        companyName,
      });
    }

    const prompt = buildSkillGapPrompt(
      parsedResume,
      resumeRawText,
      jobTitle,
      companyName,
      jobDescription,
      requirements,
      responsibilities,
      experienceForPrompt
    );

    console.log("[skill-gap] Calling openai/gpt-4o-mini via InsForge...");

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      temperature: 0.15,
      maxTokens: 4500,
      messages: [
        {
          role: "system",
          content: `You are a precise career intelligence engine.
Analyze skill gaps based ONLY on provided resume data vs job requirements.
Return ONLY valid JSON matching the specified schema exactly.
Never invent skills. Never hallucinate experience.
Zero markdown. Zero code fences.`,
        },
        { role: "user", content: prompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";

    let analysis: Record<string, unknown>;
    try {
      analysis = parseJsonFromAiContent(rawContent);
    } catch (parseErr) {
      console.error(
        "[skill-gap] JSON parse failed:",
        rawContent.substring(0, 500),
        parseErr
      );
      return err("AI returned malformed JSON. Please try again.", 500);
    }

    const required = [
      "roleMatchScore",
      "skillsYouHave",
      "criticalGaps",
      "learningRoadmap",
    ];
    const missing = required.filter((f) => !(f in analysis));
    if (missing.length > 0) {
      console.error("[skill-gap] Missing fields:", missing);
      return err(
        `AI response missing: ${missing.join(", ")}. Please retry.`,
        500
      );
    }

    let score = Math.round(Number(analysis.roleMatchScore));
    if (Number.isNaN(score)) score = 0;
    analysis.roleMatchScore = Math.max(0, Math.min(100, score));

    const gaps = analysis.criticalGaps;
    if (Array.isArray(gaps) && gaps.length > 0) {
      analysis.criticalGaps = varyDemandScores(
        gaps.filter((g) => g && typeof g === "object") as Record<
          string,
          unknown
        >[]
      );
    }

    const lr = analysis.learningRoadmap as { phases?: unknown } | undefined;
    const safeRoadmap =
      lr && typeof lr === "object" && Array.isArray(lr.phases)
        ? lr
        : { totalWeeks: 0, phases: [] };

    const diff = String(analysis.difficultyLevel ?? "");
    const difficultyLevel =
      diff === "easy" ||
      diff === "moderate" ||
      diff === "hard" ||
      diff === "very_hard"
        ? diff
        : "moderate";

    const normalized = {
      ...analysis,
      estimatedWeeksToReady:
        Number(analysis.estimatedWeeksToReady) > 0
          ? Math.round(Number(analysis.estimatedWeeksToReady))
          : 12,
      difficultyLevel,
      skillsRequired: Array.isArray(analysis.skillsRequired)
        ? analysis.skillsRequired
        : [],
      skillsYouHave: Array.isArray(analysis.skillsYouHave)
        ? analysis.skillsYouHave
        : [],
      criticalGaps: Array.isArray(analysis.criticalGaps)
        ? analysis.criticalGaps
        : [],
      partialSkills: Array.isArray(analysis.partialSkills)
        ? analysis.partialSkills
        : [],
      domainBreakdown: Array.isArray(analysis.domainBreakdown)
        ? analysis.domainBreakdown
        : [],
      radarData: Array.isArray(analysis.radarData) ? analysis.radarData : [],
      learningRoadmap: safeRoadmap,
    };

    const insertPayload: Record<string, unknown> = {
      candidate_id: dbUser.id,
      job_listing_id: jobListingId,
      job_title: jobTitle,
      company_name: companyName || null,
      target_role: jobTitle,
      experience_level: experienceLevel,
      source,
      analysis: normalized,
      resume_snapshot: {
        resumeId: latestResume?.id,
        fileName: latestResume?.title,
        skillCount,
      },
      readiness_score: Number(analysis.roleMatchScore),
      missing_skills: normalized.criticalGaps ?? [],
    };

    const { data: saved, error: saveErr } = await insforge.database
      .from("skill_gaps")
      .insert(insertPayload)
      .select("id")
      .single();

    if (saveErr) {
      console.error("[skill-gap] Save error (non-blocking):", saveErr);
    }

    return ok({
      ...normalized,
      cached: false,
      analysisId: saved?.id,
      resumeFileName: latestResume?.title ?? null,
      jobTitle,
      companyName,
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg =
      error instanceof Error ? error.message : "Analysis failed";
    console.error("[skill-gap] Route error:", msg, error);
    return err(msg, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { dbUser } = await withAuth(req);
    const jobListingId = new URL(req.url).searchParams.get("job_listing_id");

    let query = insforge.database
      .from("skill_gaps")
      .select(
        "id, job_title, company_name, target_role, experience_level, created_at, job_listing_id"
      )
      .eq("candidate_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (jobListingId?.trim()) {
      query = query.eq("job_listing_id", jobListingId.trim());
    }

    const { data, error } = await query;
    if (error) return err(error.message, 500);
    return ok(data ?? []);
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    return err("Failed to load history", 500);
  }
}
