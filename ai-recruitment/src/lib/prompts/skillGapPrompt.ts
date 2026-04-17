/**
 * JD-grounded skill gap prompt. Normalizes Prisma ResumeVersion.parsedContent
 * (skills, experience/work_experience, projects, education, certifications).
 */
export function buildSkillGapPrompt(
  parsedResume: Record<string, unknown>,
  resumeRawText: string,
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  requirements: string,
  responsibilities: string,
  experienceLevel: string
): string {
  const candidateSkills: string[] = (
    (parsedResume.skills ?? []) as unknown[]
  )
    .map((s) =>
      typeof s === "string" ? s : String((s as { name?: string }).name ?? "")
    )
    .filter(Boolean);

  const expRaw = (parsedResume.work_experience ??
    parsedResume.experience ??
    []) as Record<string, unknown>[];

  const workExperience = expRaw.map((e) => ({
    title: (e.title as string) ?? (e.role as string) ?? "Unknown Role",
    company:
      (e.company as string) ??
      (e.organization as string) ??
      "Unknown Company",
    startDate: (e.startDate as string) ?? "",
    endDate: (e.endDate as string) ?? "Present",
    bullets: ((e.bullets ?? e.responsibilities ?? e.highlights ?? []) as unknown[])
      .slice(0, 5)
      .map((b) =>
        typeof b === "string" ? b : String((b as { text?: string }).text ?? "")
      )
      .filter(Boolean),
  }));

  const projects = ((parsedResume.projects ?? []) as Record<string, unknown>[]).map(
    (p) => {
      const tech = p.techStack ?? p.technologies;
      const techStr = Array.isArray(tech)
        ? tech.join(", ")
        : typeof tech === "string"
          ? tech
          : "";
      return {
        name: (p.name as string) ?? "Unnamed Project",
        techStack: techStr,
        bullets: ((p.bullets ?? []) as unknown[])
          .slice(0, 3)
          .map((b) =>
            typeof b === "string"
              ? b
              : String((b as { text?: string }).text ?? "")
          )
          .filter(Boolean),
      };
    }
  );

  const education = (
    (parsedResume.education ?? []) as Record<string, unknown>[]
  ).map(
    (e) =>
      `${(e.degree as string) ?? ""} from ${(e.institution as string) ?? (e.school as string) ?? ""} (${(e.endDate as string) ?? ""})`
  );

  const certifications = ((parsedResume.certifications ?? []) as unknown[])
    .map((c) =>
      typeof c === "string" ? c : String((c as { name?: string }).name ?? "")
    )
    .filter(Boolean);

  const hasResume =
    candidateSkills.length > 0 || workExperience.length > 0 || projects.length > 0;

  const fullJD = `
JOB TITLE: ${jobTitle}
COMPANY: ${companyName}
EXPERIENCE LEVEL REQUIRED: ${experienceLevel}

JOB DESCRIPTION:
${jobDescription}

REQUIREMENTS:
${requirements}

RESPONSIBILITIES:
${responsibilities}
`.trim();

  const candidateProfile = hasResume
    ? `
CANDIDATE SKILLS (${candidateSkills.length} total):
${candidateSkills.join(", ")}

WORK EXPERIENCE:
${workExperience
  .map(
    (e) =>
      `• ${e.title} @ ${e.company} (${e.startDate} - ${e.endDate})
${e.bullets.map((b) => `  - ${b}`).join("\n")}`
  )
  .join("\n\n") || "No experience listed"}

PROJECTS:
${projects
  .map(
    (p) =>
      `• ${p.name} [Tech: ${p.techStack || "not specified"}]
${p.bullets.map((b) => `  - ${b}`).join("\n")}`
  )
  .join("\n\n") || "No projects listed"}

EDUCATION:
${education.join("\n") || "Not specified"}

CERTIFICATIONS:
${certifications.join(", ") || "None listed"}

ADDITIONAL RESUME CONTEXT (first 2000 chars):
${(resumeRawText ?? "").substring(0, 2000)}
`
    : `NOTE: Candidate has not uploaded a resume (or parsed profile is empty).
Analyze as a generic candidate targeting ${jobTitle} at ${experienceLevel} level.
All skillsYouHave arrays should be empty. Focus analysis on what is required.`;

  return `
You are a world-class senior technical recruiter and career coach with 20+
years of experience at FAANG companies. You specialize in precise,
personalized skill gap analysis that tells candidates EXACTLY what they
need to learn to land specific roles.

Your analysis must be:
- DEEPLY PERSONALIZED to this candidate's actual resume content
- STRICTLY GROUNDED in the provided job description and requirements
- REALISTIC about gaps — do not sugarcoat or inflate match scores
- SPECIFIC — every finding must reference actual resume content vs JD
- ACTIONABLE — every gap must have a concrete learning path

=================================================================
CANDIDATE PROFILE
=================================================================
${candidateProfile}

=================================================================
TARGET JOB
=================================================================
${fullJD}

=================================================================
ANALYSIS INSTRUCTIONS
=================================================================

1. ROLE MATCH SCORE (0-100):
   - Compare candidate's actual skills against JD required skills
   - Weight critical/required skills 3x more than nice-to-have
   - <40 = poor match, 40-59 = fair, 60-74 = good, 75-89 = strong, 90+ = exceptional
   - Be strict — a 90+ means the candidate could apply TODAY

2. SKILLS YOU HAVE:
   - List ONLY skills found in the candidate's actual resume
   - Assess proficiency based on evidence (multiple projects = expert,
     one mention = beginner)
   - Include relevance score (0-100) indicating how important this skill
     is for the target role

3. CRITICAL GAPS:
   - Skills explicitly required in the JD that are MISSING from resume
   - Sort by impact on role match score (highest impact first)
   - Each gap must explain WHY it matters for THIS specific role
   - Estimate realistic learning time based on skill complexity

4. PARTIAL SKILLS:
   - Skills the candidate has but at insufficient depth for the role
   - Must be specific about what level is required vs current level

5. LEARNING ROADMAP:
   - Phase-by-phase learning plan ordered by priority
   - Each phase builds on the previous
   - Items must directly address the identified critical gaps
   - Include realistic time estimates (assume 2hrs/day commitment)

6. RADAR DATA:
   - 6 domains assessed based on ACTUAL resume content vs JD requirements
   - yourScore must reflect genuine assessment of resume evidence
   - marketDemand must reflect what the JD actually requires

=================================================================
REQUIRED JSON OUTPUT
=================================================================

Return ONLY this JSON. Zero markdown. Zero explanation. Zero backticks.

{
  "roleMatchScore": <integer 0-100, strict weighted calculation>,

  "timeToReady": "<realistic range e.g. '4-6 months' or '2-3 weeks'>",

  "estimatedWeeksToReady": <integer>,

  "difficultyLevel": "easy|moderate|hard|very_hard",

  "totalSkillsRequired": <integer, count from JD>,

  "jobContext": {
    "jobTitle": "${jobTitle.replace(/"/g, '\\"')}",
    "company": "${companyName.replace(/"/g, '\\"')}",
    "experienceLevel": "${experienceLevel.replace(/"/g, '\\"')}",
    "topRequiredSkills": ["<top 5 most critical skills from JD>"]
  },

  "skillsYouHave": [
    {
      "name": "<skill ACTUALLY in candidate resume>",
      "proficiency": "beginner|intermediate|expert",
      "category": "Frontend|Backend|DevOps|Cloud|AI/ML|Database|Mobile|Security|Tools|Soft Skills",
      "relevanceToRole": <0-100, how important for this JD>,
      "evidence": "<where in resume this was found>"
    }
  ],

  "criticalGaps": [
    {
      "skill": "<skill REQUIRED in JD but ABSENT from resume>",
      "demandScore": <0-100, based on emphasis in JD>,
      "priority": "critical|important|nice_to_have",
      "estimatedWeeks": <realistic weeks to reach job-ready proficiency>,
      "why": "<specific reason this matters for ${jobTitle.replace(/"/g, '\\"')} at ${companyName.replace(/"/g, '\\"')}>",
      "relevantRoles": ["<job titles that heavily use this skill>"],
      "foundInJD": "<exact quote or section from JD requiring this skill>"
    }
  ],

  "partialSkills": [
    {
      "skill": "<skill candidate has but needs deeper expertise>",
      "currentLevel": "beginner|intermediate",
      "requiredLevel": "intermediate|expert",
      "specificGap": "<exact gap — e.g. 'Has basic React but JD requires Redux + performance optimization'>",
      "estimatedWeeks": <weeks to bridge gap>
    }
  ],

  "radarData": [
    {
      "domain": "Technical Skills",
      "yourScore": <0-100 based on technical skills in resume vs JD>,
      "marketDemand": <0-100 based on JD technical requirements>
    },
    {
      "domain": "System Design",
      "yourScore": <based on architecture/design evidence in resume>,
      "marketDemand": <based on JD system design requirements>
    },
    {
      "domain": "Tools & DevOps",
      "yourScore": <based on tools mentioned in resume>,
      "marketDemand": <based on JD tooling requirements>
    },
    {
      "domain": "Domain Knowledge",
      "yourScore": <based on industry/domain experience>,
      "marketDemand": <based on JD domain requirements>
    },
    {
      "domain": "Communication",
      "yourScore": <estimated from resume quality and soft skills>,
      "marketDemand": <based on JD communication requirements>
    },
    {
      "domain": "Leadership",
      "yourScore": <based on leadership indicators in resume>,
      "marketDemand": <based on JD leadership requirements>
    }
  ],

  "domainBreakdown": [
    {
      "domain": "<domain name>",
      "matchPercent": <0-100>,
      "status": "strong|partial|weak",
      "candidateSkillsInDomain": ["<actual skills from resume in this domain>"],
      "missingInDomain": ["<JD-required skills in this domain not in resume>"]
    }
  ],

  "learningRoadmap": {
    "totalWeeks": <sum of all phase durations>,
    "phases": [
      {
        "phase": 1,
        "title": "<phase name — e.g. 'Close Critical Gaps'>",
        "weeks": "Weeks 1-N",
        "color": "#3B82F6",
        "rationale": "<why this phase comes first>",
        "items": [
          {
            "id": "p1_item_1",
            "type": "learn|build|practice",
            "title": "<specific learning task>",
            "description": "<what to learn and why it matters for ${jobTitle.replace(/"/g, '\\"')}>",
            "estimatedWeeks": <number>,
            "skillAddressed": "<which criticalGap this closes>",
            "resources": [
              {
                "type": "video|course|docs|book|practice",
                "title": "<real resource name>",
                "platform": "<YouTube|Coursera|Udemy|Official Docs|LeetCode|etc>",
                "duration": "<e.g. 8 hours or 3 weeks>",
                "free": true
              }
            ]
          }
        ]
      }
    ]
  },

  "personalizedInsights": [
    "<specific insight about THIS candidate's background relative to ${jobTitle.replace(/"/g, '\\"')}>",
    "<what makes them competitive or not for this specific role>",
    "<unique angle or strength they should emphasize in their application>"
  ],

  "applicationReadiness": {
    "canApplyNow": <boolean — true if score >= 65>,
    "recommendedAction": "<specific next step>",
    "estimatedInterviewChance": "<e.g. '35% chance of passing initial screen'>",
    "keyStrengthsToHighlight": ["<what to emphasize in cover letter/interview>"],
    "mustFixBeforeApplying": ["<critical gaps that would get resume rejected>"]
  }
}
`.trim();
}
