import { describe, it, expect } from "vitest";
import { jobSchemaFromListing, jobSchemaFromText } from "@/scoring/jd-heuristic";

describe("jd-heuristic", () => {
  it("builds job schema from listing tech stack without LLM", () => {
    const job = jobSchemaFromListing({
      id: "job-1",
      title: "Senior Backend Engineer",
      companyName: "Acme",
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: "Senior",
      salaryRange: null,
      techStack: ["Python", "PostgreSQL", "AWS"],
      category: "Engineering",
      isFeatured: false,
      description: "Build scalable APIs with Python and PostgreSQL.",
      requirements: "5+ years experience with Python required.",
      responsibilities: "Design and ship backend services.",
      niceToHave: "Kubernetes experience preferred.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(job.title).toBe("Senior Backend Engineer");
    expect(job.requiredSkills.map((s) => s.skillName)).toEqual(
      expect.arrayContaining(["Python", "PostgreSQL", "AWS"])
    );
    expect(job.roleType).toBe("IC");
    expect(job.seniorityExpected).toBe("L3");
  });

  it("extracts skills from free-text JD", () => {
    const job = jobSchemaFromText({
      jdText: "Looking for React and TypeScript developers with 3+ years experience.",
      jobTitle: "Frontend Engineer",
    });

    expect(job.requiredSkills.length).toBeGreaterThan(0);
    expect(
      job.requiredSkills.some((s) =>
        /react|typescript/i.test(s.skillName)
      )
    ).toBe(true);
  });
});
