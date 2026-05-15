import { prisma } from "@/lib/db";
import type { SalaryType } from "@prisma/client";

export class CompensationRepository {
  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  async upsertSalaryProfile(input: {
    userId: string;
    minSalary: number;
    maxSalary: number;
    currency: string;
    salaryType: SalaryType;
    isNegotiable: boolean;
    preferredLocations: string[];
    confidenceScore: number;
  }) {
    return prisma.userSalaryProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        minSalary: input.minSalary,
        maxSalary: input.maxSalary,
        currency: input.currency,
        salaryType: input.salaryType,
        isNegotiable: input.isNegotiable,
        preferredLocations: input.preferredLocations,
        confidenceScore: input.confidenceScore,
      },
      update: {
        minSalary: input.minSalary,
        maxSalary: input.maxSalary,
        currency: input.currency,
        salaryType: input.salaryType,
        isNegotiable: input.isNegotiable,
        preferredLocations: input.preferredLocations,
        confidenceScore: input.confidenceScore,
      },
    });
  }

  async getSalaryProfileByUserId(userId: string) {
    return prisma.userSalaryProfile.findUnique({
      where: { userId },
    });
  }

  async deleteSalaryProfileByUserId(userId: string) {
    await prisma.userSalaryProfile.deleteMany({ where: { userId } });
  }

  async getSalaryInsight(input: {
    role: string;
    location: string;
    currency: string;
    salaryType: SalaryType;
  }) {
    return prisma.salaryInsights.findFirst({
      where: {
        role: { equals: input.role, mode: "insensitive" },
        location: { equals: input.location, mode: "insensitive" },
        currency: input.currency,
        salaryType: input.salaryType,
      },
    });
  }
}
