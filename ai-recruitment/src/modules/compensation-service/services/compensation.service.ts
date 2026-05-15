import type { SalaryType } from "@prisma/client";
import { computeSalaryMatchScore } from "../engines/salary-matching.engine";
import { CompensationRepository } from "../repositories/compensation.repository";

export class CompensationService {
  constructor(private readonly repository = new CompensationRepository()) {}

  async upsertSalaryProfile(email: string, input: {
    minSalary: number;
    maxSalary: number;
    currency: string;
    salaryType: SalaryType;
    isNegotiable: boolean;
    preferredLocations: string[];
    confidenceScore?: number;
  }) {
    const user = await this.repository.getUserByEmail(email);
    if (!user) throw new Error("User not found");

    const profile = await this.repository.upsertSalaryProfile({
      userId: user.id,
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
      currency: input.currency.toUpperCase(),
      salaryType: input.salaryType,
      isNegotiable: input.isNegotiable,
      preferredLocations: input.preferredLocations,
      confidenceScore: input.confidenceScore ?? 0.7,
    });

    return profile;
  }

  async getSalaryProfile(email: string) {
    const user = await this.repository.getUserByEmail(email);
    if (!user) throw new Error("User not found");

    return this.repository.getSalaryProfileByUserId(user.id);
  }

  async deleteSalaryProfile(email: string) {
    const user = await this.repository.getUserByEmail(email);
    if (!user) throw new Error("User not found");

    await this.repository.deleteSalaryProfileByUserId(user.id);
  }

  async scoreJobSalaryMatch(email: string, input: {
    role: string;
    location: string;
    currency: string;
    salaryType: SalaryType;
    jobMinSalary?: number | null;
    jobMaxSalary?: number | null;
  }) {
    const user = await this.repository.getUserByEmail(email);
    if (!user) return null;

    const profile = await this.repository.getSalaryProfileByUserId(user.id);
    if (!profile) return null;

    const insight = await this.repository.getSalaryInsight({
      role: input.role,
      location: input.location,
      currency: input.currency.toUpperCase(),
      salaryType: input.salaryType,
    });

    return computeSalaryMatchScore({
      userMinSalary: profile.minSalary,
      userMaxSalary: profile.maxSalary,
      userIsNegotiable: profile.isNegotiable,
      marketAvgSalary: insight?.avgSalary,
      marketP75Salary: insight?.percentile75,
      jobMinSalary: input.jobMinSalary,
      jobMaxSalary: input.jobMaxSalary,
    });
  }
}
