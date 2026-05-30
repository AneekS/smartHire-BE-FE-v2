import { describe, it, expect } from "vitest";
import {
  computeFinalScore,
  computeScoreHash,
} from "@/scoring/engine/FinalScoreComputer";
import { INDUSTRY_WEIGHTS } from "@/scoring/constants";
import type { ResumeSchemaType } from "@/models/resume.schema";

const resume: ResumeSchemaType = {
  fullName: "Test",
  email: "t@test.com",
  phone: null,
  location: null,
  industryDomain: "TECH",
  summary: "Experienced backend engineer",
  skills: [{ skillName: "Java", domain: "BACKEND", level: 3 }],
  experience: [],
  education: [],
  parseConfidence: 0.9,
  field_confidence: {},
};

const components = {
  semanticMatch: 70,
  skillMatch: 80,
  experienceMatch: 75,
  atsCompliance: 85,
  projectRelevance: 60,
  educationMatch: 90,
  resumeQuality: 88,
};

describe("FinalScoreComputer", () => {
  it("produces identical scoreHash for identical inputs", () => {
    const weights = INDUSTRY_WEIGHTS.TECH;
    const a = computeFinalScore(components, weights, {
      resumeVersionId: "rv-1",
      jobId: "job-1",
      resume,
      parseConfidence: 0.9,
      calibrationSampleSize: 100,
    });
    const b = computeFinalScore(components, weights, {
      resumeVersionId: "rv-1",
      jobId: "job-1",
      resume,
      parseConfidence: 0.9,
      calibrationSampleSize: 100,
    });
    expect(a.scoreHash).toBe(b.scoreHash);
    expect(a.overallScore).toBe(b.overallScore);
  });

  it("computeScoreHash is stable", () => {
    const hash = computeScoreHash({
      resumeVersionId: "rv-1",
      jobId: "job-1",
      weights: INDUSTRY_WEIGHTS.GENERAL,
      componentScores: components,
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
