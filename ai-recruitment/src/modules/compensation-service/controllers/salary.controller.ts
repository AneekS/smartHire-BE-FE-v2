import { NextResponse } from "next/server";
import { CompensationService } from "../services/compensation.service";

export class SalaryController {
  constructor(private readonly compensationService = new CompensationService()) {}

  async getProfile(email: string) {
    const profile = await this.compensationService.getSalaryProfile(email);
    return NextResponse.json({ profile });
  }

  async upsertProfile(email: string, payload: {
    minSalary: number;
    maxSalary: number;
    currency: string;
    salaryType: "MONTHLY" | "YEARLY";
    isNegotiable: boolean;
    preferredLocations: string[];
    confidenceScore?: number;
  }) {
    const profile = await this.compensationService.upsertSalaryProfile(email, payload);
    return NextResponse.json({ profile });
  }

  async deleteProfile(email: string) {
    await this.compensationService.deleteSalaryProfile(email);
    return NextResponse.json({ profile: null });
  }
}
