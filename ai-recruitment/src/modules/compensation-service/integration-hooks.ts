import type { SalaryType } from "@prisma/client";
import { CompensationService } from "./services/compensation.service";

const compensationService = new CompensationService();

/**
 * Hook for job recommendation engine: enrich each recommendation with salary fit.
 */
export async function getSalaryScoreForRecommendation(input: {
  email: string;
  role: string;
  location: string;
  currency: string;
  salaryType: SalaryType;
  jobMinSalary?: number | null;
  jobMaxSalary?: number | null;
}) {
  return compensationService.scoreJobSalaryMatch(input.email, input);
}

/**
 * Hook for candidate matching engine: compare candidate salary profile to offer band.
 */
export async function getSalaryScoreForCandidateMatch(input: {
  email: string;
  role: string;
  location: string;
  currency: string;
  salaryType: SalaryType;
  offeredMinSalary?: number | null;
  offeredMaxSalary?: number | null;
}) {
  return compensationService.scoreJobSalaryMatch(input.email, {
    role: input.role,
    location: input.location,
    currency: input.currency,
    salaryType: input.salaryType,
    jobMinSalary: input.offeredMinSalary,
    jobMaxSalary: input.offeredMaxSalary,
  });
}
