export type CareerPathStage = "EARLY" | "MID" | "SENIOR";

export type SkillGapResult = {
  missingSkills: string[];
  readinessScore: number;
};

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateSkillMatch(candidateSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 100;
  const candidateSet = new Set(candidateSkills.map(normalizeText));
  const matched = requiredSkills.filter((skill) => candidateSet.has(normalizeText(skill))).length;
  return Math.round((matched / requiredSkills.length) * 100);
}

export function calculateExperienceMatch(
  candidateExperienceYears: number,
  jobMin?: number | null,
  jobMax?: number | null
): number {
  const exp = Math.max(candidateExperienceYears, 0);
  if (jobMin == null && jobMax == null) return 70;
  const min = jobMin ?? 0;
  const max = jobMax ?? min + 5;

  if (exp >= min && exp <= max) return 100;
  if (exp < min) {
    const gap = min - exp;
    return Math.round(clamp(100 - gap * 20, 0, 100));
  }

  const over = exp - max;
  return Math.round(clamp(95 - over * 10, 0, 100));
}

export function calculateLocationMatch(input: {
  candidateLocation?: string | null;
  preferredLocations?: string[];
  jobLocation?: string | null;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE" | null;
  openToRelocation?: boolean;
}): number {
  if (input.workMode === "REMOTE") return 100;

  const candidateLocation = normalizeText(input.candidateLocation ?? "");
  const jobLocation = normalizeText(input.jobLocation ?? "");
  const preferred = (input.preferredLocations ?? []).map(normalizeText);

  if (!jobLocation) return 60;
  if (preferred.some((location) => jobLocation.includes(location) || location.includes(jobLocation))) {
    return 100;
  }
  if (candidateLocation && (jobLocation.includes(candidateLocation) || candidateLocation.includes(jobLocation))) {
    return 95;
  }
  if (input.openToRelocation) return 70;
  return 20;
}

export function calculateSalaryFit(input: {
  expectedMin?: number | null;
  expectedMax?: number | null;
  jobMin?: number | null;
  jobMax?: number | null;
}): number {
  const { expectedMin, expectedMax, jobMin, jobMax } = input;
  if (jobMin == null && jobMax == null) return 60;
  if (expectedMin == null && expectedMax == null) return 75;

  const salaryMin = jobMin ?? 0;
  const salaryMax = jobMax ?? salaryMin;
  const preferredMin = expectedMin ?? 0;
  const preferredMax = expectedMax ?? preferredMin;

  if (salaryMax < preferredMin) {
    const delta = preferredMin - salaryMax;
    return Math.round(clamp(90 - delta * 2, 0, 100));
  }

  if (salaryMin > preferredMax) {
    return 85;
  }

  return 100;
}

export function calculateBehavioralScore(input: {
  roleAffinity: number;
  industryAffinity: number;
  negativeAffinity: number;
}): number {
  const raw = 50 + input.roleAffinity * 0.6 + input.industryAffinity * 0.3 - input.negativeAffinity * 0.7;
  return Math.round(clamp(raw, 0, 100));
}

export function calculateRolePreferenceBoost(input: {
  preferredRoles?: string[];
  preferredIndustries?: string[];
  title: string;
  industry?: string | null;
  workMode?: string | null;
  preferredWorkMode?: string | null;
}): number {
  const title = normalizeText(input.title);
  const industry = normalizeText(input.industry ?? "");
  const roles = (input.preferredRoles ?? []).map(normalizeText);
  const industries = (input.preferredIndustries ?? []).map(normalizeText);

  let boost = 0;
  if (roles.some((role) => title.includes(role))) boost += 10;
  if (industry && industries.some((preferred) => industry.includes(preferred))) boost += 6;
  if (
    input.preferredWorkMode &&
    input.workMode &&
    normalizeText(input.preferredWorkMode) === normalizeText(input.workMode)
  ) {
    boost += 4;
  }

  return boost;
}

export function detectSkillGap(candidateSkills: string[], requiredSkills: string[]): SkillGapResult {
  const candidateSet = new Set(candidateSkills.map(normalizeText));
  const missingSkills = requiredSkills.filter((skill) => !candidateSet.has(normalizeText(skill)));
  const readinessScore = requiredSkills.length === 0
    ? 100
    : Math.round(((requiredSkills.length - missingSkills.length) / requiredSkills.length) * 100);

  return {
    missingSkills,
    readinessScore,
  };
}

export function inferCareerPathStage(currentExperienceYears: number): CareerPathStage {
  if (currentExperienceYears < 2) return "EARLY";
  if (currentExperienceYears < 6) return "MID";
  return "SENIOR";
}

export function calculateCareerPathBoost(input: {
  stage: CareerPathStage;
  title: string;
}): number {
  const title = normalizeText(input.title);
  if (input.stage === "EARLY" && /(junior|associate|entry|intern)/.test(title)) return 8;
  if (input.stage === "MID" && /(engineer|developer|analyst|specialist)/.test(title)) return 8;
  if (input.stage === "SENIOR" && /(senior|lead|staff|principal|manager)/.test(title)) return 8;
  return 0;
}

export function calculateMatchScore(input: {
  skillMatch: number;
  experienceMatch: number;
  locationMatch: number;
  salaryFit: number;
  behavioralScore: number;
  semanticScore: number;
  rolePreferenceBoost: number;
  careerPathBoost: number;
}): number {
  const weighted =
    0.4 * input.skillMatch +
    0.2 * input.experienceMatch +
    0.2 * input.locationMatch +
    0.1 * input.salaryFit +
    0.1 * input.behavioralScore;

  const semanticBoost = input.semanticScore * 0.08;
  const score = weighted + semanticBoost + input.rolePreferenceBoost + input.careerPathBoost;

  return Math.round(clamp(score, 0, 100));
}
