export function buildRecommendationReasons(input: {
  skillMatch: number;
  experienceMatch: number;
  locationMatch: number;
  salaryFit: number;
  behavioralScore: number;
  semanticScore: number;
  roleBoost: number;
  careerBoost: number;
}): string[] {
  const reasons: string[] = [];

  if (input.skillMatch >= 80) reasons.push("Strong skill alignment");
  if (input.experienceMatch >= 80) reasons.push("Experience level aligned");
  if (input.locationMatch >= 80) reasons.push("Location preference matched");
  if (input.salaryFit >= 80) reasons.push("Salary expectation aligned");
  if (input.behavioralScore >= 70) reasons.push("Matches your recent job activity");
  if (input.semanticScore >= 70) reasons.push("Resume semantics closely match job description");
  if (input.roleBoost > 0) reasons.push("Role and industry preference matched");
  if (input.careerBoost > 0) reasons.push("Aligned with your next career stage");

  return reasons.slice(0, 4);
}
