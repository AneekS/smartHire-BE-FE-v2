import { describe, expect, it } from "vitest";
import { JobRecommendationService } from "@/services/recommendations/job-recommendation.service";

const fakeRepository = {
  getCandidateContext: async () => ({
    id: "cand-1",
    email: "candidate@example.com",
    location: "Bangalore",
    experience: 2,
    skills: ["React", "TypeScript", "Node.js"],
    preferredRoles: ["Frontend Engineer"],
    preferredIndustries: ["SaaS"],
    preferredLocations: ["Bangalore"],
    preferredWorkMode: "HYBRID",
    expectedSalaryMin: 10,
    expectedSalaryMax: 18,
    openToRelocation: true,
    profileId: "profile-1",
    resumeText: "Frontend engineer with React and TypeScript experience",
  }),
  getJobsForRecommendation: async () => [
    {
      id: "job-1",
      title: "Frontend Engineer",
      description: "Build React applications",
      requirements: "React TypeScript",
      location: "Bangalore",
      workMode: "HYBRID" as const,
      salaryMin: 12,
      salaryMax: 20,
      experienceMin: 1,
      experienceMax: 3,
      requiredSkills: ["React", "TypeScript"],
      createdAt: new Date(),
      company: {
        id: "company-1",
        name: "SmartHire",
        industry: "SaaS",
      },
      applicants: 45,
    },
  ],
  getBehaviorSummary: async () => ({
    roleSignals: [{ token: "frontend", score: 10 }],
    industrySignals: [{ token: "saas", score: 5 }],
    negativeSignals: [],
  }),
  getMarketIntelligence: async () => ({
    trendingSkills: [{ skill: "React", demandCount: 100 }],
    highDemandRoles: [{ role: "Frontend Engineer", demandCount: 80 }],
    topHiringCompanies: [{ companyName: "SmartHire", activeJobs: 20 }],
  }),
  getLatestResumeEmbedding: async () => null,
  upsertResumeEmbedding: async () => undefined,
  getJobEmbeddings: async () => [],
  upsertJobEmbeddings: async () => undefined,
  persistJobRecommendations: async () => undefined,
  createBehaviorEvent: async () => ({ id: "event-1" }),
  getJobById: async () => null,
  getCandidatesForRecruiter: async () => [],
};

describe("JobRecommendationService", () => {
  it("returns grouped recommendation sections", async () => {
    const service = new JobRecommendationService(fakeRepository as never);
    const result = await service.getRecommendations({ candidateId: "cand-1", limit: 10 });

    expect(result.recommendedJobs).toHaveLength(1);
    expect(Array.isArray(result.trendingJobs)).toBe(true);
    expect(Array.isArray(result.highMatchJobs)).toBe(true);
    expect(Array.isArray(result.newJobs)).toBe(true);
  });
});
