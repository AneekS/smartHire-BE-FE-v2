import { describe, expect, it, beforeEach } from "vitest";
import { DealBreakerDetector } from "@/scoring/dealbreaker";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { parseJobSchema } from "@/models/job.schema";
import { parseResumeSchema } from "@/models/resume.schema";

const baseResume = parseResumeSchema({
  fullName: "Jane Doe",
  yearsOfExperience: 8,
  seniorityBand: "L4",
  skills: [
    {
      skillName: "C++",
      level: 4,
      yearsWithSkill: 5,
      lastUsedYear: 2025,
      domain: "BACKEND",
    },
  ],
  education: [{ degree: "BS", field: "Computer Science", institution: "MIT" }],
  experience: [],
});

describe("DealBreakerDetector", () => {
  beforeEach(() => {
    SkillCanonicalizer.reset();
  });

  it("triggers PhD dealbreaker when required and missing", () => {
    const jd = parseJobSchema({
      title: "Research Scientist",
      dealbreakers: ["PhD required"],
      educationRequirement: "PHD",
    });
    const result = DealBreakerDetector.check(baseResume, jd);
    expect(result.capScore).toBe(true);
    expect(result.triggered.some((t) => /phd/i.test(t))).toBe(true);
  });

  it("triggers years-of-skill dealbreaker", () => {
    const jd = parseJobSchema({
      title: "Systems Engineer",
      dealbreakers: ["8+ years C++ required"],
      requiredSkills: [{ skillName: "C++", minLevel: 4, isMustHave: true }],
    });
    const result = DealBreakerDetector.check(baseResume, jd);
    expect(result.capScore).toBe(true);
    expect(result.triggered.length).toBeGreaterThan(0);
  });

  it("passes when no dealbreakers apply", () => {
    const jd = parseJobSchema({
      title: "Software Engineer",
      requiredSkills: [{ skillName: "C++", minLevel: 3, isMustHave: true }],
    });
    const result = DealBreakerDetector.check(baseResume, jd);
    expect(result.triggered).toHaveLength(0);
    expect(result.capScore).toBe(false);
  });
});
