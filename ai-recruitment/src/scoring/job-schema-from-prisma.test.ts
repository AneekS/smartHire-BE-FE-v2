import { describe, expect, it, beforeEach } from "vitest";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { jobSchemaFromPrismaJob } from "@/scoring/job-schema-from-prisma";

describe("jobSchemaFromPrismaJob", () => {
  beforeEach(() => {
    SkillCanonicalizer.reset();
  });

  it("merges JobSkill and requiredSkills with DB overriding text duplicates", () => {
    const job = jobSchemaFromPrismaJob({
      id: "job-1",
      title: "Platform Engineer",
      description: "We need Python and AWS experience.",
      requirements: "Docker required",
      requiredSkills: ["Kubernetes"],
      industryProfile: "TECH",
      experienceMin: 5,
      experienceMax: 12,
      seniorityBand: "L4",
      jobSkills: [
        { name: "Docker", normalized: "docker", importance: 4 },
        { name: "Python", normalized: "python", importance: 3 },
      ],
    });

    expect(job.minYearsExperience).toBe(5);
    expect(job.maxYearsExperience).toBe(12);
    expect(job.seniorityExpected).toBe("L4");

    const docker = job.requiredSkills.find((s) =>
      s.skillName.toLowerCase().includes("docker")
    );
    expect(docker?.isMustHave).toBe(true);
    expect(docker?.minLevel).toBe(4);

    const k8s = job.requiredSkills.find((s) =>
      s.skillName.toLowerCase().includes("kubernetes")
    );
    expect(k8s?.isMustHave).toBe(false);
  });
});
