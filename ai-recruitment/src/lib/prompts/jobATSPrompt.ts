export function buildJobATSPrompt(
  resumeText: string,
  parsedResume: Record<string, unknown>,
  jobTitle: string,
  companyName: string,
  jobDescription: string
): string {
  const skills = ((parsedResume.skills ?? []) as unknown[])
    .map((s) => (typeof s === "string" ? s : (s as { name?: string }).name))
    .filter(Boolean);

  const experience = (
    (parsedResume.work_experience ??
      parsedResume.experience ??
      []) as Record<string, unknown>[]
  ).map((e) => ({
    title: (e.title as string) ?? "",
    company: (e.company as string) ?? "",
    duration: `${(e.startDate as string) ?? ""} - ${(e.endDate as string) ?? "Present"}`,
    highlights: ((e.bullets ?? e.highlights ?? []) as unknown[])
      .slice(0, 4)
      .map((b) =>
        typeof b === "string" ? b : (b as { text?: string }).text ?? ""
      ),
  }));

  const projects = ((parsedResume.projects ?? []) as Record<string, unknown>[]).map(
    (p) => ({
      name: (p.name as string) ?? "",
      tech: (
        Array.isArray(p.techStack ?? p.technologies)
          ? (p.techStack ?? p.technologies)
          : []
      ).join(", "),
      points: ((p.bullets ?? []) as unknown[])
        .slice(0, 2)
        .map((b) =>
          typeof b === "string" ? b : (b as { text?: string }).text ?? ""
        ),
    })
  );

  const education = (
    (parsedResume.education ?? []) as Record<string, unknown>[]
  ).map(
    (e) =>
      `${(e.degree as string) ?? ""} — ${(e.institution as string) ?? (e.school as string) ?? ""} (${(e.endDate as string) ?? ""})`
  );

  const certifications = ((parsedResume.certifications ?? []) as unknown[])
    .map((c) => (typeof c === "string" ? c : (c as { name?: string }).name ?? ""))
    .filter(Boolean);

  return `
You are a world-class ATS (Applicant Tracking System) engine combined with
a senior technical recruiter with 20 years of experience at FAANG companies.

Your ATS scoring must be:
- HIGHLY SPECIFIC to both the candidate's actual resume AND the target job
- STRICT and realistic — 90+ means exceptional, 75+ means strong, 60+ means moderate
- NEVER generic — every insight must reference actual resume content vs JD requirements
- DETERMINISTIC — same inputs must produce consistent scores within ±5 points

=================================================================
CANDIDATE RESUME
=================================================================

SKILLS (${skills.length} total):
${skills.join(", ") || "None listed"}

WORK EXPERIENCE:
${experience
  .map(
    (e) =>
      `• ${e.title} @ ${e.company} (${e.duration})
   ${e.highlights.map((h: string) => `  - ${h}`).join("\n")}`
  )
  .join("\n\n") || "No experience listed"}

PROJECTS:
${projects
  .map(
    (p) =>
      `• ${p.name} [${p.tech}]
   ${p.points.map((pt: string) => `  - ${pt}`).join("\n")}`
  )
  .join("\n\n") || "No projects listed"}

EDUCATION:
${education.join("\n") || "Not specified"}

CERTIFICATIONS:
${certifications.join(", ") || "None"}

FULL RESUME TEXT (for keyword matching):
---
${resumeText.substring(0, 2500)}
---

=================================================================
TARGET JOB
=================================================================

ROLE: ${jobTitle}
COMPANY: ${companyName}

JOB DESCRIPTION:
---
${jobDescription.substring(0, 2500)}
---

=================================================================
SCORING METHODOLOGY
=================================================================

Calculate each component score with this strict rubric:

1. KEYWORD MATCH (35% weight):
   - Extract ALL technical keywords, tools, frameworks, methodologies from JD
   - Check each against resume text (exact match, synonym match, partial match)
   - Score = (matched_critical_keywords / total_critical_keywords) * 100
   - Penalize heavily for missing CRITICAL keywords (marked as required in JD)

2. EXPERIENCE MATCH (25% weight):
   - Compare years of experience required vs candidate's actual years
   - Assess relevance of past roles to the target role
   - Evaluate depth of experience in required domains
   - Score based on role title similarity and responsibility overlap

3. SKILLS MATCH (20% weight):
   - Direct comparison of JD required skills vs resume skills section
   - Weight critical skills higher than nice-to-have
   - Penalize for completely absent required technical skills
   - Reward for additional valuable skills not mentioned in JD

4. EDUCATION MATCH (10% weight):
   - Degree requirement match (BS/MS/PhD)
   - Field of study relevance
   - GPA if mentioned and notable
   - Certifications that substitute for degree requirements

5. FORMATTING & IMPACT (10% weight):
   - Quantified achievements (numbers, percentages, scale)
   - Action verbs and strong language
   - Resume structure clarity
   - Tailoring indicators (keywords naturally incorporated)

OVERALL SCORE FORMULA:
overall = (keyword * 0.35) + (experience * 0.25) + (skills * 0.20) + (education * 0.10) + (formatting * 0.10)

SCORE BENCHMARKS:
- 90-100: Exceptional match — top 5% of applicants for this role
- 80-89: Strong match — will likely pass ATS and get recruiter review  
- 70-79: Good match — may pass ATS with some keyword optimization
- 60-69: Fair match — significant gaps exist, needs tailoring
- 50-59: Weak match — major skill or experience gaps
- <50: Poor match — candidate profile doesn't align with role requirements

=================================================================
OUTPUT FORMAT
=================================================================

Return ONLY this exact JSON. Zero markdown. Zero explanation:

{
  "overallScore": <integer 0-100, calculated using formula above>,
  "scoreLabel": "Exceptional Match|Strong Match|Good Match|Fair Match|Weak Match|Poor Match",
  
  "matchSummary": "<3-4 sentences. MUST reference specific skills from resume AND specific requirements from JD. State the strongest alignment point AND the biggest gap. Be honest and specific.>",
  
  "breakdown": {
    "keywordMatch": {
      "score": <0-100>,
      "weight": 35,
      "reason": "<which critical keywords matched and which are missing>"
    },
    "experienceMatch": {
      "score": <0-100>,
      "weight": 25,
      "reason": "<years match assessment and role relevance>"
    },
    "skillsMatch": {
      "score": <0-100>,
      "weight": 20,
      "reason": "<specific skills alignment or gaps>"
    },
    "educationMatch": {
      "score": <0-100>,
      "weight": 10,
      "reason": "<degree and certification alignment>"
    },
    "formattingScore": {
      "score": <0-100>,
      "weight": 10,
      "reason": "<quantification and resume quality assessment>"
    }
  },
  
  "keywordAnalysis": {
    "present": [
      {
        "keyword": "<exact keyword from JD found in resume>",
        "frequency": <number of occurrences>,
        "context": "skills|experience|projects|education",
        "importance": "critical|important|nice_to_have"
      }
    ],
    "missing": [
      {
        "keyword": "<keyword from JD NOT in resume>",
        "importance": "critical|important|nice_to_have",
        "suggestion": "<specific, actionable way to add this naturally>",
        "section": "summary|experience|skills|projects"
      }
    ],
    "partialMatch": [
      {
        "jdKeyword": "<JD term>",
        "resumeVariant": "<what candidate wrote>",
        "recommendation": "<use exact JD terminology for better ATS parsing>"
      }
    ]
  },
  
  "sectionScores": {
    "summary": {
      "score": <0-100>,
      "feedback": "<specific feedback referencing actual summary content>",
      "hasSummary": <boolean>
    },
    "experience": {
      "score": <0-100>,
      "feedback": "<assess quantification, relevance, and depth>",
      "yearsOfExperience": <estimated years from resume or null>,
      "requiredYears": <from JD or null>,
      "relevantRoles": ["<job titles from resume relevant to this JD>"]
    },
    "skills": {
      "score": <0-100>,
      "feedback": "<skills coverage assessment>",
      "matchedSkills": ["<skills in BOTH resume and JD>"],
      "missingCriticalSkills": ["<skills REQUIRED by JD but ABSENT from resume>"]
    },
    "education": {
      "score": <0-100>,
      "feedback": "<degree match assessment>",
      "meetsRequirement": <boolean>
    },
    "projects": {
      "score": <0-100>,
      "feedback": "<do projects demonstrate required technical skills?>",
      "relevantProjects": ["<project names that demonstrate JD-required skills>"]
    }
  },
  
  "recommendations": {
    "critical": [
      {
        "priority": 1,
        "action": "<specific action — e.g. 'Add Kubernetes to skills section'>",
        "impact": "+8-12 ATS points",
        "example": "<concrete example of the change to make>"
      }
    ],
    "important": [
      {
        "priority": <2,3,4>,
        "action": "<improvement action>",
        "impact": "+3-7 ATS points",
        "example": "<example>"
      }
    ],
    "quickWins": [
      {
        "action": "<easy 5-minute change>",
        "timeToImplement": "5 mins|15 mins|30 mins",
        "impact": "+2-5 ATS points"
      }
    ]
  },
  
  "competitiveAnalysis": {
    "strongPoints": ["<genuine strengths vs typical applicants for this role>"],
    "weakPoints": ["<honest, specific gaps vs role requirements>"],
    "uniqueSellingPoints": ["<standout differentiators that could impress recruiters>"],
    "estimatedPassRate": "<e.g. '65% chance of passing initial ATS filter'>"
  },
  
  "tailoredSummary": "<AI-written professional summary specifically for ${jobTitle} at ${companyName}. 3-4 sentences. Uses actual candidate skills and experience. Incorporates key JD terms naturally. Ready to paste into resume.>",
  
  "topMissingKeywordsToAdd": [
    "<keyword 1 — highest impact missing term>",
    "<keyword 2>",
    "<keyword 3>",
    "<keyword 4>",
    "<keyword 5>"
  ]
}
`;
}
