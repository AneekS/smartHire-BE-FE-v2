import { NextResponse } from "next/server";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";
import { withAuth } from "@/lib/auth-middleware";
import { requireAuth } from "@/lib/insforge-server";
import { insforge } from "@/lib/insforge";
import { z } from "zod";
import { prisma } from "@/lib/db";

const LegacyBodySchema = z.object({ target_role: z.string().min(1) });

const NewBodySchema = z.object({
  targetRole: z.string().optional(),
  experienceLevel: z.enum(["entry", "mid", "senior", "staff"]).optional(),
  source: z.enum(["resume", "manual"]).optional(),
});

type ParsedContent = {
  contactInfo?: { name?: string; email?: string };
  summary?: string;
  experience?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    bullets?: Array<{ text?: string }>;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    endDate?: string;
  }>;
  skills?: Array<{ name?: string; category?: string } | string>;
  projects?: Array<{
    name?: string;
    description?: string;
    techStack?: string[];
    bullets?: Array<{ text?: string }>;
  }>;
  certifications?: Array<{ name?: string }>;
};

function getSkillNames(skills: ParsedContent["skills"]): string[] {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((s) => (typeof s === "string" ? s : s?.name ?? (s as { name?: string }).name ?? ""))
    .filter(Boolean);
}

function buildCandidateContext(parsed: ParsedContent): string {
  const skillNames = getSkillNames(parsed.skills);
  const experience = (parsed.experience ?? []).map((e) => ({
    title: e.title ?? "",
    company: e.company ?? "",
    duration: `${e.startDate ?? ""} - ${e.endDate ?? "Present"}`,
    bullets: (e.bullets ?? []).map((b) => (typeof b === "string" ? b : b?.text ?? "")).slice(0, 4),
  }));
  const projects = (parsed.projects ?? []).map((p) => ({
    name: p.name ?? "",
    techStack: p.techStack ?? [],
    bullets: (p.bullets ?? []).map((b) => (typeof b === "string" ? b : b?.text ?? "")).slice(0, 2),
  }));
  const education = (parsed.education ?? []).map((e) => ({
    degree: e.degree ?? "",
    institution: e.institution ?? "",
    endDate: e.endDate ?? "",
  }));

  return `
## CANDIDATE'S ACTUAL RESUME DATA

### Current Skills (${skillNames.length} skills):
${skillNames.length ? skillNames.join(", ") : "None listed"}

### Work Experience:
${experience.length ? experience.map((e) => `- ${e.title} at ${e.company} (${e.duration})\n  ${e.bullets.filter(Boolean).join("\n  ")}`).join("\n") : "None listed"}

### Projects:
${projects.length ? projects.map((p) => `- ${p.name}${p.techStack.length ? ` [${p.techStack.join(", ")}]` : ""}\n  ${p.bullets.filter(Boolean).join("\n  ")}`).join("\n") : "None listed"}

### Education:
${education.length ? education.map((e) => `- ${e.degree} from ${e.institution} (${e.endDate})`).join("\n") : "None listed"}

### Professional Summary:
${parsed.summary ?? "Not provided"}
`.trim();
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
    }

    console.log("[gap-analysis] Request received for candidate:", candidateId);

    let targetRole: string | undefined;
    let experienceLevel: "entry" | "mid" | "senior" | "staff" = "mid";
    let source: "resume" | "manual" = "manual";

    const legacyParsed = LegacyBodySchema.safeParse(rawBody);
    if (legacyParsed.success) {
      targetRole = legacyParsed.data.target_role;
    } else {
      const parsed = NewBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues.map((x) => x.message).join(", "), code: "INVALID_BODY" },
          { status: 400 }
        );
      }
      targetRole = parsed.data.targetRole?.trim();
      source = parsed.data.source ?? "manual";
      if (parsed.data.experienceLevel) experienceLevel = parsed.data.experienceLevel;
    }

    if (source === "manual" && !targetRole) {
      return NextResponse.json(
        { error: "targetRole is required for target role analysis", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    console.log("[gap-analysis] Params:", { targetRole, experienceLevel, source });

    let user: { id: string; email?: string };
    let client: Awaited<ReturnType<typeof requireAuth>>["client"];
    try {
      const authResult = await requireAuth();
      user = authResult.user;
      client = authResult.client;
    } catch (authErr) {
      console.error("[gap-analysis] Auth failed:", authErr);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user?.email ?? "";

    // ─── STEP 1: Get full parsed resume from Prisma (same as Resume Optimizer) ───
    const dbUser = await prisma.user.findUnique({ where: { email } });
    let parsedContent: ParsedContent | null = null;
    let inferredTargetRole = targetRole;

    if (dbUser) {
      const resume = await prisma.resumeVersion.findFirst({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
      });
      if (resume?.parsedContent) {
        try {
          parsedContent = JSON.parse(resume.parsedContent) as ParsedContent;
          if (!inferredTargetRole && parsedContent.experience?.[0]?.title) {
            inferredTargetRole = parsedContent.experience[0].title;
          }
        } catch {
          // ignore parse error
        }
      }
    }

    const effectiveTargetRole = inferredTargetRole || targetRole || "Software Engineer";

    if (source === "resume" && !parsedContent) {
      return NextResponse.json(
        { error: "Please upload and parse a resume first", code: "NO_RESUME" },
        { status: 400 }
      );
    }

    const candidateContext = parsedContent
      ? buildCandidateContext(parsedContent)
      : "## NOTE: No resume uploaded. Analyze for a typical candidate targeting the given role.";

    const skillNames = parsedContent ? getSkillNames(parsedContent.skills) : [];
    const experienceCount = parsedContent?.experience?.length ?? 0;
    const projectCount = parsedContent?.projects?.length ?? 0;

    console.log("[gap-analysis] Candidate context:", {
      skillsCount: skillNames.length,
      experienceCount,
      projectCount,
      targetRole: effectiveTargetRole,
      experienceLevel,
    });

    const systemPrompt = `You are an expert tech recruiter and career coach. Perform a HIGHLY PERSONALIZED skill gap analysis.
You will receive the candidate's ACTUAL resume data and their target role.

CRITICAL RULES:
- Base skillsYouHave ONLY on skills actually mentioned in the resume (list every skill from the resume, not a subset).
- Base criticalGaps on what is MISSING from the resume for the target role.
- Make demandScore VALUES VARIED and realistic (e.g. 85, 72, 65, 58 — never all the same).
- Make estimatedWeeks realistic based on skill complexity.
- Tailor everything to this specific candidate — no generic boilerplate.
- Return ONLY valid JSON. No markdown, no code fence, no explanation.`;

    const userPrompt = `
${candidateContext}

---
TARGET ROLE: ${effectiveTargetRole}
EXPERIENCE LEVEL: ${experienceLevel}

Analyze this specific candidate's gaps for the target role. Return this exact JSON structure only:

{
  "readiness_score": <0-100, realistic match based on actual skills>,
  "strong_skills": [ "<skill1>", "<skill2>", ... every skill from the resume ],
  "missing_skills": [
    {
      "skill": "<specific skill missing for this role>",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "reason": "<brief reason specific to this role>",
      "estimated_hours": <number>,
      "demand_score": <0-100, VARIED per skill, e.g. 88, 72, 65>
    }
  ],
  "summary": "<one short personalized paragraph>"
}

- strong_skills: include ALL skills from the candidate's resume (every one listed in the resume).
- missing_skills: 3-8 items; demand_score must be DIFFERENT for each (e.g. 90, 78, 65, 55).
- Do not return identical demand_score for every missing skill.
`;

    try {
      const completion = await insforge.ai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawResponse = completion.choices[0]?.message?.content ?? "{}";
      const trimmed = rawResponse.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      let result: {
        readiness_score?: number;
        strong_skills?: string[] | Array<{ name?: string }>;
        missing_skills?: Array<{
          skill?: string;
          priority?: string;
          reason?: string;
          estimated_hours?: number;
          demand_score?: number;
        }>;
        summary?: string;
      } = jsonMatch ? (() => {
        try {
          return JSON.parse(jsonMatch[0]) as typeof result;
        } catch {
          return {};
        }
      })() : {};

      if (!Array.isArray(result.strong_skills)) result.strong_skills = [];
      if (!Array.isArray(result.missing_skills)) result.missing_skills = [];

      // ─── Apply demand score variance if AI returned identical values ───
      const gaps = result.missing_skills;
      const scores = gaps.map((g) => g.demand_score ?? 75);
      const allSame = scores.length > 1 && scores.every((s) => s === scores[0]);
      if (allSame) {
        console.warn("[gap-analysis] AI returned identical demand scores — applying variance");
        result.missing_skills = gaps.map((g, i) => ({
          ...g,
          demand_score: Math.max(40, Math.min(95, (g.demand_score ?? 75) - i * 8 + Math.floor(Math.random() * 6))),
        }));
        result.missing_skills.sort((a, b) => (b.demand_score ?? 0) - (a.demand_score ?? 0));
      }

      const readiness = typeof result.readiness_score === "number" ? result.readiness_score : Number(result.readiness_score) || 0;

      console.log("[gap-analysis] Analysis complete:", {
        skillsFound: result.strong_skills?.length ?? 0,
        gapsFound: result.missing_skills?.length ?? 0,
        matchScore: readiness,
      });

      // Optional: persist to InsForge skill_gaps if available (non-blocking)
      try {
        if (client?.database) {
          await client.database.from("skill_gaps").insert({
            candidate_id: candidateId,
            target_role: effectiveTargetRole,
            missing_skills: result.missing_skills,
            readiness_score: readiness,
          });
        }
      } catch {
        // ignore
      }

      return NextResponse.json({
        readiness_score: readiness,
        strong_skills: result.strong_skills,
        missing_skills: result.missing_skills,
        summary: result.summary ?? "",
        lastAnalyzedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[POST /api/v1/skills/gap-analysis]", e);
      return NextResponse.json(
        { error: "Analysis failed", code: "ANALYSIS_FAILED" },
        { status: 500 }
      );
    }
  });
}
