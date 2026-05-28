// ─── Pass 1: Broad Extraction ─────────────────────────────────────────────────
export const BROAD_EXTRACTION_PROMPT = `
You are an expert resume parser. Extract ALL information from the resume text into
the exact JSON schema below. Return ONLY valid JSON — no markdown, no preamble,
no explanation.

SCHEMA (every field is required; use null if absent):
{
  "personalInfo": {
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "location": string | null,
    "linkedIn": string | null,
    "github": string | null,
    "portfolio": string | null
  },
  "summary": string | null,
  "industryDomain": "TECH" | "FINANCE" | "HEALTHCARE" | "SALES" | "LEGAL" | "GENERAL",
  "seniorityBand": "L1" | "L2" | "L3" | "L4" | "L5" | "L6",
  "yearsOfExperience": number,
  "skills": [
    {
      "name": string,
      "domain": "FRONTEND" | "BACKEND" | "DATABASES" | "DEVOPS" | "DATA_AI" | "CLOUD" | "MOBILE" | "SECURITY" | "SOFT_SKILLS" | "OTHER",
      "proficiencyLevel": 1 | 2 | 3 | 4 | 5
    }
  ],
  "experience": [
    {
      "company": string,
      "title": string,
      "startDate": "YYYY-MM" | null,
      "endDate": "YYYY-MM" | null,
      "isCurrent": boolean,
      "durationMonths": number | null,
      "responsibilities": string[],
      "achievements": string[],
      "techStack": string[]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string | null,
      "field": string | null,
      "startYear": number | null,
      "endYear": number | null,
      "gpa": number | null
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "techStack": string[],
      "url": string | null,
      "impact": string | null
    }
  ],
  "certifications": [
    { "name": string, "issuer": string | null, "year": number | null }
  ],
  "achievements": string[],
  "languages": [
    { "name": string, "proficiency": "native" | "fluent" | "professional" | "basic" }
  ],
  "field_confidence": {
    "personalInfo": number,
    "summary": number,
    "industryDomain": number,
    "seniorityBand": number,
    "yearsOfExperience": number,
    "skills": number,
    "experience": number,
    "education": number,
    "projects": number,
    "certifications": number,
    "achievements": number
  }
}

SENIORITY BAND TABLE:
L1 = 0–1 year   (intern, entry-level)
L2 = 1–2 years  (junior)
L3 = 2–5 years  (mid-level)
L4 = 5–8 years  (senior)
L5 = 8–12 years (staff / lead / principal)
L6 = 12+ years  (director / VP / distinguished)

ACHIEVEMENT EXTRACTION RULES:
- Extract ALL quantified achievements: percentages (%), dollar amounts ($), user counts, team sizes, latency (ms), uptime (%)
- Example: "Reduced API latency by 40%" → achievements array entry

SKILL DOMAIN MAPPING:
- React, Vue, Angular, Next.js, CSS, HTML → FRONTEND
- Node.js, Python, Java, Go, Rust, .NET, Express → BACKEND
- PostgreSQL, MySQL, MongoDB, Redis, DynamoDB → DATABASES
- Docker, Kubernetes, Terraform, CI/CD, Jenkins → DEVOPS
- TensorFlow, PyTorch, Scikit-learn, LLM, ML → DATA_AI
- AWS, Azure, GCP, S3, Lambda → CLOUD
- iOS, Android, React Native, Flutter → MOBILE
- OAuth, SAML, Penetration Testing, SOC2 → SECURITY

Set field_confidence values between 0.0 and 1.0 based on how clearly the
information was stated in the resume. Low confidence (< 0.70) means the field
was inferred or the source text was ambiguous.
`.trim();

// ─── Section-focused retry (when broad pass returns sparse JSON) ─────────────
export const SECTION_EXPERIENCE_PROMPT = `
Extract ONLY the "experience" array from the resume section below.
Return JSON: { "experience": [ { "company", "title", "startDate": "YYYY-MM"|null, "endDate": "YYYY-MM"|null, "isCurrent", "durationMonths": null, "responsibilities": string[], "achievements": string[], "techStack": string[] } ] }
Include every job/internship listed. Use null for missing dates. Return ONLY valid JSON.
`.trim();

export const SECTION_EDUCATION_PROMPT = `
Extract ONLY the "education" array from the resume section below.
Return JSON: { "education": [ { "institution", "degree", "field", "startYear", "endYear", "gpa" } ] }
Return ONLY valid JSON.
`.trim();

export const SECTION_SKILLS_PROMPT = `
Extract ONLY the "skills" array from the resume section below.
Return JSON: { "skills": [ { "name", "domain": "FRONTEND"|"BACKEND"|"DATABASES"|"DEVOPS"|"DATA_AI"|"CLOUD"|"MOBILE"|"SECURITY"|"SOFT_SKILLS"|"OTHER", "proficiencyLevel": 1-5 } ] }
Return ONLY valid JSON.
`.trim();

// ─── Pass 2: Gap Fill ─────────────────────────────────────────────────────────
export function GAP_FILL_PROMPT(
  lowConfidenceFields: string[],
  contextSections: Record<string, string>,
  fewShots: string[]
): string {
  const fieldList = lowConfidenceFields.join(", ");
  const ctxBlocks = Object.entries(contextSections)
    .map(([section, text]) => `--- ${section.toUpperCase()} SECTION ---\n${text}`)
    .join("\n\n");
  const exampleStr =
    fewShots.length > 0
      ? `\n\nINDUSTRY EXAMPLES (use as formatting reference only):\n${fewShots.join("\n---\n")}`
      : "";

  return `
You are fixing specific low-confidence fields in a partially-parsed resume.

LOW-CONFIDENCE FIELDS TO RE-EXTRACT: ${fieldList}

RELEVANT RESUME SECTIONS:
${ctxBlocks}
${exampleStr}

Return ONLY a JSON object containing ONLY the low-confidence fields listed above.
Use the exact same field names and types as the original schema.
Do not return fields that were not listed as low-confidence.
Include updated field_confidence values for each field you return.
Return ONLY valid JSON — no markdown, no preamble.
`.trim();
}

// ─── Pass 3: Self-Critique ────────────────────────────────────────────────────
export const SELF_CRITIQUE_PROMPT = `
You are a senior resume data quality reviewer. You will receive:
1. The original resume source text
2. A parsed JSON object

Your job: identify and fix ALL inconsistencies between the source text and the JSON.
Return the corrected JSON only. No explanation, no markdown.

CONSISTENCY RULES YOU MUST ENFORCE:
1. SENIORITY vs EXPERIENCE YEARS
   L1=0-1yr, L2=1-2yr, L3=2-5yr, L4=5-8yr, L5=8-12yr, L6=12+yr
   If seniorityBand and yearsOfExperience are misaligned by more than 1 band, correct seniorityBand.

2. QUANTIFIED ACHIEVEMENTS
   Every experience entry and the achievements array must capture ALL numeric values
   (%, $, users, team size, performance metrics) that appear in the source text.
   If any are missing, add them.

3. SKILL DOMAIN ALIGNMENT
   Every skill must have the correct domain per the mapping:
   React/Vue/Angular/Next.js → FRONTEND
   Node.js/Python/Java/Go → BACKEND
   PostgreSQL/MySQL/MongoDB/Redis → DATABASES
   Docker/Kubernetes/Terraform → DEVOPS
   TensorFlow/PyTorch/ML/LLM → DATA_AI
   AWS/Azure/GCP → CLOUD
   iOS/Android/Flutter → MOBILE

4. MISSING EXPERIENCE ENTRIES
   Every job, contract, or consulting role mentioned in the source text must appear
   in the experience array. Add any missing entries.

5. CURRENT ROLE CONSISTENCY
   If isCurrent=true, endDate must be null. Fix any violations.

After corrections, update field_confidence to reflect improved accuracy.
Return the complete corrected JSON in the original schema format.
`.trim();

export const IMPROVEMENTS_PROMPT = `You are an expert ATS optimization tool. Analyze the structured resume JSON and generate 2-4 improvements.
Return ONLY valid JSON:
{
  "improvements": [{
    "id": "uuid",
    "severity": "critical"|"important"|"suggestion",
    "section": "contactInfo"|"experience"|"summary"|"education"|"projects"|"skills",
    "fieldPath": "experience.0.bullets.0",
    "title": "Short title",
    "description": "Explanation",
    "originalText": "exact text from resume",
    "suggestedText": "optimized text with metrics",
    "impact": "High"|"Medium"
  }]
}`;

export const JD_PARSE_PROMPT = `Decompose this job description into structured JSON for ATS scoring.

RULES:
- Extract dealbreakers from language like "must have", "required", "will not consider", "PhD required", clearance, license, work authorization.
- Split requiredSkills (must-have) vs niceToHaveSkills (preferred). Each skill: { "skillName", "minLevel": 1-5, "isMustHave": true/false }.
- Infer roleType: IC | MANAGER | EXECUTIVE | SALES | HEALTHCARE.
- Infer seniorityExpected: L1-L6 based on title and years required.
- Infer industryDomain: TECH | FINANCE | HEALTHCARE | SALES | CREATIVE | LEGAL | GENERAL.
- keyResponsibilities: top 5 only (not more).
- mustHaveKeywords: non-negotiable terms from JD (not company name).
- Do NOT include benefits, EEO statements, legal disclaimers, or company boilerplate in any field.
- educationRequirement: NONE | HIGH_SCHOOL | BACHELORS | MASTERS | PHD.

Return ONLY valid JSON:
{
  "title": "",
  "roleTitle": "",
  "companyName": "",
  "location": null,
  "experienceLevel": null,
  "seniorityExpected": "L3",
  "industryDomain": "TECH",
  "roleType": "IC",
  "requiredSkills": [{ "skillName": "Python", "minLevel": 3, "isMustHave": true }],
  "niceToHaveSkills": [{ "skillName": "Kubernetes", "minLevel": 2 }],
  "minYearsExperience": null,
  "maxYearsExperience": null,
  "educationRequirement": "BACHELORS",
  "keyResponsibilities": [],
  "mustHaveKeywords": [],
  "dealbreakers": [],
  "responsibilities": [],
  "requirements": [],
  "description": "",
  "salaryRange": null,
  "jobType": null
}`;

export const EXPLAIN_SCORE_PROMPT = `Given candidate resume context and job requirements, explain the match score.
Return JSON: { "explanation": "...", "reasons": ["..."], "missingSkills": ["..."], "matchedSkills": ["..."] }`;
