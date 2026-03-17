export function buildJobATSPrompt(
  resumeText: string,
  parsedResume: any,
  jobTitle: string,
  companyName: string,
  jobDescription: string
): string {
  const candidateSkills = (parsedResume.skills ?? [])
    .map((s: any) => (typeof s === "string" ? s : s.name))
    .filter(Boolean)
    .join(", ");

  const candidateExperience = (parsedResume.experience ?? parsedResume.work_experience ?? [])
    .map(
      (e: any) =>
        `${e.title ?? ""} at ${e.company ?? ""} (${e.startDate ?? ""}-${e.endDate ?? "Present"})`
    )
    .join("\n");

  const candidateProjects = (parsedResume.projects ?? [])
    .map(
      (p: any) =>
        `${p.name ?? ""}: [${Array.isArray(p.techStack ?? p.technologies) ? (p.techStack ?? p.technologies).join(", ") : ""}]`
    )
    .join("\n");

  return `
You are a world-class ATS (Applicant Tracking System) and senior technical 
recruiter with 15+ years of experience screening candidates at top tech 
companies including Google, Meta, Amazon, and top-tier startups.

Your task is to perform a HIGHLY ACCURATE, DEEPLY PERSONALIZED ATS analysis
of a candidate's resume against a specific job description.

You must think like BOTH an ATS robot AND a human senior recruiter.

=============================================================
CANDIDATE RESUME DATA
=============================================================

SKILLS: ${candidateSkills || "Not specified"}

WORK EXPERIENCE:
${candidateExperience || "No experience listed"}

PROJECTS:
${candidateProjects || "No projects listed"}

EDUCATION:
${(parsedResume.education ?? [])
  .map(
    (e: any) =>
      `${e.degree ?? ""} from ${e.institution ?? e.school ?? ""} (${e.endDate ?? ""})`
  )
  .join("\n") || "Not specified"}

CERTIFICATIONS:
${(parsedResume.certifications ?? [])
  .map((c: any) => (typeof c === "string" ? c : c.name ?? ""))
  .join(", ") || "None"}

FULL RESUME TEXT (for keyword extraction):
${resumeText.substring(0, 3000)}

=============================================================
TARGET JOB
=============================================================

ROLE: ${jobTitle}
COMPANY: ${companyName || "Not specified"}

JOB DESCRIPTION:
${jobDescription.substring(0, 3000)}

=============================================================
INSTRUCTIONS
=============================================================

Perform a precise ATS analysis. Be strict and realistic.
A 90+ score means the candidate is an exceptional match.
A 70-89 means good match with minor gaps.
A 50-69 means moderate match, significant gaps exist.
Below 50 means poor match for this specific role.

DO NOT inflate scores. Be honest and specific.
Every score must be justified by actual resume content vs JD content.

Return ONLY this exact JSON structure. Zero markdown. Zero backticks:

{
  "overallScore": <0-100, strict realistic ATS score>,
  
  "scoreLabel": "Excellent Match|Strong Match|Good Match|Fair Match|Weak Match",
  
  "matchSummary": "<2-3 sentences explaining why the candidate is or isn't a fit. Reference SPECIFIC skills and requirements from both resume and JD>",
  
  "breakdown": {
    "keywordMatch": {
      "score": <0-100>,
      "weight": 35,
      "reason": "<specific keywords found vs missing>"
    },
    "experienceMatch": {
      "score": <0-100>,
      "weight": 25,
      "reason": "<years of experience match, relevant roles match>"
    },
    "skillsMatch": {
      "score": <0-100>,
      "weight": 20,
      "reason": "<technical skills alignment>"
    },
    "educationMatch": {
      "score": <0-100>,
      "weight": 10,
      "reason": "<degree requirements match>"
    },
    "formattingScore": {
      "score": <0-100>,
      "weight": 10,
      "reason": "<resume structure, quantifiable achievements, clarity>"
    }
  },
  
  "keywordAnalysis": {
    "present": [
      {
        "keyword": "<keyword from JD found in resume>",
        "frequency": <number of times found>,
        "context": "<where it appears: skills/experience/projects>",
        "importance": "critical|important|nice_to_have"
      }
    ],
    "missing": [
      {
        "keyword": "<keyword from JD NOT found in resume>",
        "importance": "critical|important|nice_to_have",
        "suggestion": "<how to naturally add this to resume>",
        "section": "<which resume section to add it to>"
      }
    ],
    "partialMatch": [
      {
        "jdKeyword": "<keyword in JD>",
        "resumeVariant": "<similar term found in resume>",
        "recommendation": "<use exact JD terminology instead>"
      }
    ]
  },
  
  "sectionScores": {
    "summary": {
      "score": <0-100>,
      "feedback": "<specific feedback on summary vs JD requirements>",
      "hasSummary": true|false
    },
    "experience": {
      "score": <0-100>,
      "feedback": "<are bullet points quantified, relevant to JD?>",
      "yearsOfExperience": <number or null>,
      "requiredYears": <from JD or null>,
      "relevantRoles": ["<relevant job titles from resume>"]
    },
    "skills": {
      "score": <0-100>,
      "feedback": "<skill alignment with JD>",
      "matchedSkills": ["<skills in both resume and JD>"],
      "missingCriticalSkills": ["<skills required by JD but absent from resume>"]
    },
    "education": {
      "score": <0-100>,
      "feedback": "<degree match>",
      "meetsRequirement": true|false
    },
    "projects": {
      "score": <0-100>,
      "feedback": "<do projects demonstrate required skills?>",
      "relevantProjects": ["<project names relevant to this JD>"]
    }
  },
  
  "recommendations": {
    "critical": [
      {
        "priority": 1,
        "action": "<specific action to take>",
        "impact": "<how many points this could add to the score>",
        "example": "<concrete example of the change>"
      }
    ],
    "important": [
      {
        "priority": <number>,
        "action": "<specific improvement>",
        "impact": "<score impact>",
        "example": "<example>"
      }
    ],
    "quickWins": [
      {
        "action": "<easy change with high impact>",
        "timeToImplement": "<5 mins|15 mins|30 mins>",
        "impact": "<expected score improvement>"
      }
    ]
  },
  
  "competitiveAnalysis": {
    "strongPoints": ["<what makes this candidate competitive for this role>"],
    "weakPoints": ["<honest gaps vs typical candidates for this role>"],
    "uniqueSellingPoints": ["<standout things on resume relevant to this JD>"],
    "estimatedPassRate": "<percentage chance of passing ATS filter for this JD>"
  },
  
  "tailoredSummary": "<AI-written suggested professional summary tailored specifically for this job. 3-4 sentences. Incorporate key JD terms naturally. Based on candidate's actual resume content>",
  
  "topMissingKeywordsToAdd": [
    "<top 5 most impactful keywords to add, in priority order>"
  ]
}
`;
}

