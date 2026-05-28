import { NextRequest } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { buildSkillGapPrompt } from "@/lib/prompts/skillGapPrompt";

const openai = new OpenAI();

type ExperienceLevel = "entry" | "mid" | "senior" | "staff";

function inferRoleFromParsed(parsed: Record<string, unknown>): string {
  const exp = (parsed.experience ??
    parsed.work_experience ??
    []) as Record<string, unknown>[];
  const first = exp[0];
  const title = first?.title ?? first?.role;
  if (typeof title === "string" && title.trim()) return title.trim();
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
        return err("Please upload and parse a resume first", 400);
      }
    }

    let jobTitle = "";
    let companyName = "";
    let jobDescription = "";
    let requirements = "";
    let responsibilities = "";
    let experienceForPrompt: string = experienceLevel;

    if (jobListingId) {
      const listing = await prisma.jobListing.findFirst({
        where: { id: jobListingId, isActive: true },
      });

      if (!listing) return err("Job listing not found", 404);

      jobTitle = listing.title;
      companyName = "";
      jobDescription = listing.description ?? "";
      requirements = "";
      responsibilities = "";
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

    const candidate = await prisma.candidate.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    });

    // Cache: check for recent analysis within 12h window
    if (jobListingId && candidate) {
      const cacheWindow = new Date(Date.now() - 12 * 60 * 60 * 1000);

      const cachedRow = await prisma.jobListingSkillGap.findFirst({
        where: {
          candidateId: candidate.id,
          listingId: jobListingId,
          createdAt: { gte: cacheWindow },
        },
        orderBy: { createdAt: "desc" },
      });

      const cachedAnalysis = cachedRow?.gaps as
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
          cachedAt: cachedRow.createdAt,
          analysisId: cachedRow.id,
          resumeFileName: latestResume?.title ?? null,
          jobTitle,
          companyName,
        });
      }
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

    console.log("[skill-gap] Calling gpt-4o-mini via OpenAI...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.15,
      max_tokens: 4500,
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

    let savedId: string | undefined;
    if (candidate && jobListingId) {
      try {
        const saved = await prisma.jobListingSkillGap.create({
          data: {
            candidateId: candidate.id,
            listingId: jobListingId,
            gaps: JSON.parse(JSON.stringify(normalized)),
          },
          select: { id: true },
        });
        savedId = saved.id;
      } catch (saveErr) {
        console.error("[skill-gap] Save error (non-blocking):", saveErr);
      }
    }

    return ok({
      ...normalized,
      cached: false,
      analysisId: savedId,
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

    const candidate = await prisma.candidate.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    });
    if (!candidate) return err("Candidate profile not found", 404);

    const where: { candidateId: string; listingId?: string } = {
      candidateId: candidate.id,
    };
    if (jobListingId?.trim()) {
      where.listingId = jobListingId.trim();
    }

    const rows = await prisma.jobListingSkillGap.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { listing: { select: { title: true } } },
    });

    const mapped = rows.map((row) => ({
      id: row.id,
      jobTitle: row.listing.title,
      jobListingId: row.listingId,
      createdAt: row.createdAt,
    }));

    return ok(mapped);
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    return err("Failed to load history", 500);
  }
}
