import { describe, it, expect } from "vitest";
import { ATSResponseTransformer } from "@/lib/transformers/ATSResponseTransformer";

describe("ATSResponseTransformer", () => {
  const v2Score = {
    id: "score-v2-1",
    tenantId: "tenant-1",
    applicationId: "app-1",
    resumeVersionId: "rv-1",
    jobId: "job-1",
    finalScore: 82,
    semanticScore: 88,
    skillScore: 79,
    experienceScore: 75,
    complianceScore: 90,
    projectScore: 70,
    educationScore: 65,
    qualityScore: 80,
    confidence: 0.91,
    requiresManualReview: false,
    industryProfile: "TECH",
    seniorityBand: "L3_MID",
    computedAt: "2026-05-01T12:00:00.000Z",
    skillGaps: [
      { missingSkill: "Kubernetes", importance: 0.9, canonicalSkill: "kubernetes" },
      { missingSkill: "GraphQL", importance: 0.5 },
    ],
  };

  it("maps v2 ApplicationAtsScore to JobAtsScore", () => {
    const client = ATSResponseTransformer.toClientAts(v2Score);

    expect(client.id).toBe("score-v2-1");
    expect(client.finalScore).toBe(82);
    expect(client.confidence).toBe(0.91);
    expect(client.industryProfile).toBe("TECH");
    expect(client.seniorityBand).toBe("L3_MID");
    expect(client.computedAt).toBe("2026-05-01T12:00:00.000Z");
    expect(client.tenantId).toBeUndefined();
    expect(client.applicationId).toBeUndefined();
    expect(client.scoreHash).toBeUndefined();

    expect(client.breakdown?.semanticMatch?.score).toBe(88);
    expect(client.breakdown?.skillMatch?.score).toBe(79);
    expect(client.skillGaps).toHaveLength(2);
    expect(client.skillGaps[0]?.missingSkill).toBe("Kubernetes");
    expect(client.missingSkills).toContain("Kubernetes");
    expect(client.pipeline).toBe("application_ats_score");
  });

  it("unwraps Phase 5 API envelope", () => {
    const client = ATSResponseTransformer.toClientAts({
      success: true,
      data: v2Score,
    });
    expect(client.finalScore).toBe(82);
    expect(client.id).toBe("score-v2-1");
  });

  it("maps legacy JobAtsScore.details breakdown", () => {
    const legacy = {
      id: "legacy-1",
      candidateId: "cand-1",
      listingId: "listing-1",
      score: 71,
      createdAt: "2026-04-01T10:00:00.000Z",
      details: {
        scoreBreakdown: {
          semanticMatch: {
            score: 72,
            weight: 32,
            contribution: 23,
            reason: "Strong overlap",
          },
          skillMatch: {
            score: 68,
            weight: 28,
            contribution: 19,
            reason: "Missing React",
          },
        },
        matchedSkills: ["TypeScript"],
        missingSkills: ["React"],
        recommendation: "CONSIDER",
      },
    };

    const client = ATSResponseTransformer.toClientAts(legacy);
    expect(client.finalScore).toBe(71);
    expect(client.jobListingId).toBe("listing-1");
    expect(client.scoreLabel).toBe("Good Match");
    expect(client.breakdown?.semanticMatch?.reason).toBe("Strong overlap");
    expect(client.matchedSkills).toEqual(["TypeScript"]);
    expect(client.missingSkills).toEqual(["React"]);
    expect(client.pipeline).toBe("job_ats_score");
  });

  it("maps legacy API overallScore + scoreBreakdown shape", () => {
    const apiPayload = {
      id: "ephemeral",
      overallScore: 77,
      grade: "B+",
      recommendation: "CONSIDER",
      scoreLabel: "Good Match",
      scoreBreakdown: {
        semanticMatch: { score: 80, weight: 32, contribution: 25.6, reason: "OK" },
      },
      matchedSkills: ["Node.js"],
      missingSkills: ["AWS"],
      cached: true,
      pipeline: "ats-v3",
    };

    const client = ATSResponseTransformer.toClientAts(apiPayload);
    expect(client.finalScore).toBe(77);
    expect(client.overallScore).toBe(77);
    expect(client.cached).toBe(true);
    expect(client.pipeline).toBe("ats-v3");
    expect(client.breakdown?.semanticMatch?.score).toBe(80);
  });

  it("toBreakdownChart returns chart points from breakdown", () => {
    const chart = ATSResponseTransformer.toBreakdownChart(v2Score);
    expect(chart.length).toBeGreaterThan(0);
    expect(chart[0]).toMatchObject({
      name: expect.any(String),
      score: expect.any(Number),
      weight: expect.any(Number),
    });
    const semantic = chart.find((p) => p.name === "semanticMatch");
    expect(semantic?.score).toBe(88);
    expect(semantic?.fill).toBe("#8b5cf6");
  });

  it("toSkillGaps normalizes string missingSkills when no relation", () => {
    const gaps = ATSResponseTransformer.toSkillGaps({
      missingSkills: ["Docker", "Terraform"],
    });
    expect(gaps).toEqual([
      { missingSkill: "Docker", importance: 1 },
      { missingSkill: "Terraform", importance: 1 },
    ]);
  });
});
