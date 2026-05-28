import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaxonomyExpander } from "@/feedback/taxonomy";

vi.mock("@/lib/db", () => ({
  prisma: {
    recruiterCorrection: {
      create: vi.fn(),
      count: vi.fn(),
    },
    skillAlias: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/scoring/canonicalizer", () => ({
  SkillCanonicalizer: {
    reload: vi.fn(),
  },
}));

vi.mock("@/lib/ops-alerts", () => ({
  sendOpsAlert: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { sendOpsAlert } from "@/lib/ops-alerts";

describe("TaxonomyExpander", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates skill alias after 5 identical corrections", async () => {
    vi.mocked(prisma.recruiterCorrection.create).mockResolvedValue({
      id: "c1",
    } as never);
    vi.mocked(prisma.recruiterCorrection.count).mockResolvedValue(5);
    vi.mocked(prisma.skillAlias.upsert).mockResolvedValue({} as never);

    const result = await TaxonomyExpander.processCorrection({
      resumeId: "r1",
      field: "skills.name",
      originalValue: "k8s",
      correctedValue: "Kubernetes",
      recruiterId: "rec1",
    });

    expect(result.aliasCreated).toBe(true);
    expect(prisma.skillAlias.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { alias: "k8s" },
        create: expect.objectContaining({
          canonical: "Kubernetes",
          source: "RECRUITER_CORRECTION",
        }),
      })
    );
    expect(SkillCanonicalizer.reload).toHaveBeenCalled();
  });

  it("does not create alias for non-skills field", async () => {
    vi.mocked(prisma.recruiterCorrection.create).mockResolvedValue({} as never);
    vi.mocked(prisma.recruiterCorrection.count).mockResolvedValue(10);

    const result = await TaxonomyExpander.processCorrection({
      resumeId: "r1",
      field: "experience.title",
      originalValue: "Dev",
      correctedValue: "Developer",
      recruiterId: "rec1",
    });

    expect(result.aliasCreated).toBe(false);
    expect(prisma.skillAlias.upsert).not.toHaveBeenCalled();
  });

  it("alerts ops after 20 corrections", async () => {
    vi.mocked(prisma.recruiterCorrection.create).mockResolvedValue({} as never);
    vi.mocked(prisma.recruiterCorrection.count).mockResolvedValue(20);
    vi.mocked(prisma.skillAlias.upsert).mockResolvedValue({} as never);

    await TaxonomyExpander.processCorrection({
      resumeId: "r1",
      field: "skills.domain",
      originalValue: "react",
      correctedValue: "React",
      recruiterId: "rec1",
    });

    expect(sendOpsAlert).toHaveBeenCalled();
  });
});
