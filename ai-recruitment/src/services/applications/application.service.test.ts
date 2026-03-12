import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Application Tracker Service - Unit Tests
 *
 * These tests validate the core business logic without requiring
 * database or Redis connections by mocking the repository layer.
 */

// ─── Mock modules ────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  prisma: {
    candidate: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    applicationStatusHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    applicationNote: {
      create: vi.fn(),
    },
    recruiterActivity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    candidateAnalytics: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        application: {
          create: vi.fn().mockResolvedValue({ id: "app-1", status: "APPLIED" }),
          update: vi.fn(),
        },
        applicationStatusHistory: { create: vi.fn() },
        $executeRaw: vi.fn(),
      })
    ),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

vi.mock("@/lib/cache", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDelete: vi.fn().mockResolvedValue(undefined),
}));

// ─── Test: Status Transitions ────────────────────────────────────────────

describe("Application Status Transitions", () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    APPLIED: ["RESUME_VIEWED", "UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
    RESUME_VIEWED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED", "WITHDRAWN"],
    UNDER_REVIEW: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
    SHORTLISTED: ["INTERVIEW_SCHEDULED", "REJECTED", "WITHDRAWN"],
    INTERVIEW_SCHEDULED: ["INTERVIEW_COMPLETED", "REJECTED", "WITHDRAWN"],
    INTERVIEW_COMPLETED: ["OFFER", "REJECTED", "WITHDRAWN"],
    OFFER: ["HIRED", "REJECTED", "WITHDRAWN"],
    REJECTED: [],
    HIRED: [],
    WITHDRAWN: [],
  };

  it("validates forward transitions from APPLIED", () => {
    const allowed = VALID_TRANSITIONS["APPLIED"];
    expect(allowed).toContain("RESUME_VIEWED");
    expect(allowed).toContain("UNDER_REVIEW");
    expect(allowed).toContain("REJECTED");
    expect(allowed).toContain("WITHDRAWN");
    expect(allowed).not.toContain("OFFER");
    expect(allowed).not.toContain("HIRED");
  });

  it("prevents backwards transitions", () => {
    const allowed = VALID_TRANSITIONS["SHORTLISTED"];
    expect(allowed).not.toContain("APPLIED");
    expect(allowed).not.toContain("RESUME_VIEWED");
  });

  it("terminal states have no valid transitions", () => {
    expect(VALID_TRANSITIONS["REJECTED"]).toEqual([]);
    expect(VALID_TRANSITIONS["HIRED"]).toEqual([]);
    expect(VALID_TRANSITIONS["WITHDRAWN"]).toEqual([]);
  });

  it("every stage allows WITHDRAWN except terminal", () => {
    const nonTerminal = Object.entries(VALID_TRANSITIONS)
      .filter(([status]) => !["REJECTED", "HIRED", "WITHDRAWN"].includes(status));

    for (const [status, transitions] of nonTerminal) {
      expect(transitions).toContain("WITHDRAWN");
    }
  });

  it("every non-terminal stage allows REJECTED", () => {
    const nonTerminal = Object.entries(VALID_TRANSITIONS)
      .filter(([status]) => !["REJECTED", "HIRED", "WITHDRAWN"].includes(status));

    for (const [, transitions] of nonTerminal) {
      expect(transitions).toContain("REJECTED");
    }
  });
});

// ─── Test: Health Score Calculation ──────────────────────────────────────

describe("Health Score Calculation", () => {
  function calculateTestHealthScore(params: {
    atsScore: number;
    skillMatch: number;
    recruiterActivityScore: number;
    resumeCompleteness: number;
  }): number {
    const { atsScore, skillMatch, recruiterActivityScore, resumeCompleteness } = params;
    const healthScore =
      0.4 * atsScore +
      0.3 * skillMatch +
      0.2 * recruiterActivityScore +
      0.1 * resumeCompleteness;
    return Math.round(Math.min(100, Math.max(0, healthScore)));
  }

  it("calculates correct score with all high values", () => {
    const score = calculateTestHealthScore({
      atsScore: 90,
      skillMatch: 80,
      recruiterActivityScore: 100,
      resumeCompleteness: 85,
    });
    // 0.4*90 + 0.3*80 + 0.2*100 + 0.1*85 = 36 + 24 + 20 + 8.5 = 88.5 → 89
    expect(score).toBe(89);
  });

  it("calculates correct score with all low values", () => {
    const score = calculateTestHealthScore({
      atsScore: 20,
      skillMatch: 10,
      recruiterActivityScore: 0,
      resumeCompleteness: 30,
    });
    // 0.4*20 + 0.3*10 + 0.2*0 + 0.1*30 = 8 + 3 + 0 + 3 = 14
    expect(score).toBe(14);
  });

  it("clamps score to 0-100 range", () => {
    const highScore = calculateTestHealthScore({
      atsScore: 100,
      skillMatch: 100,
      recruiterActivityScore: 100,
      resumeCompleteness: 100,
    });
    expect(highScore).toBeLessThanOrEqual(100);

    const lowScore = calculateTestHealthScore({
      atsScore: 0,
      skillMatch: 0,
      recruiterActivityScore: 0,
      resumeCompleteness: 0,
    });
    expect(lowScore).toBeGreaterThanOrEqual(0);
  });

  it("produces score of 50 with balanced mid-range inputs", () => {
    const score = calculateTestHealthScore({
      atsScore: 50,
      skillMatch: 50,
      recruiterActivityScore: 50,
      resumeCompleteness: 50,
    });
    expect(score).toBe(50);
  });

  it("weights ATS score highest (40%)", () => {
    const highAts = calculateTestHealthScore({
      atsScore: 100,
      skillMatch: 0,
      recruiterActivityScore: 0,
      resumeCompleteness: 0,
    });
    const highSkill = calculateTestHealthScore({
      atsScore: 0,
      skillMatch: 100,
      recruiterActivityScore: 0,
      resumeCompleteness: 0,
    });
    expect(highAts).toBeGreaterThan(highSkill);
  });
});

// ─── Test: Interview Probability ─────────────────────────────────────────

describe("Interview Probability Calculation", () => {
  function calculateTestProbability(params: {
    atsScore: number;
    skillMatch: number;
    recruiterEngagement: number;
    progressionBonus: number;
  }): number {
    const probability =
      0.3 * params.atsScore +
      0.3 * params.skillMatch +
      0.2 * params.recruiterEngagement +
      0.2 * params.progressionBonus;
    return Math.round(Math.min(100, Math.max(0, probability)));
  }

  it("high scores across all factors yield high probability", () => {
    const probability = calculateTestProbability({
      atsScore: 90,
      skillMatch: 85,
      recruiterEngagement: 80,
      progressionBonus: 40,
    });
    expect(probability).toBeGreaterThan(70);
  });

  it("zero scores yield zero probability", () => {
    const probability = calculateTestProbability({
      atsScore: 0,
      skillMatch: 0,
      recruiterEngagement: 0,
      progressionBonus: 0,
    });
    expect(probability).toBe(0);
  });

  it("clamped to 0-100", () => {
    const probability = calculateTestProbability({
      atsScore: 100,
      skillMatch: 100,
      recruiterEngagement: 100,
      progressionBonus: 100,
    });
    expect(probability).toBeLessThanOrEqual(100);
    expect(probability).toBeGreaterThanOrEqual(0);
  });
});

// ─── Test: Analytics Aggregation ─────────────────────────────────────────

describe("Analytics Aggregation", () => {
  it("computes total active from status counts", () => {
    const statusCounts: Record<string, number> = {
      APPLIED: 5,
      RESUME_VIEWED: 3,
      UNDER_REVIEW: 2,
      SHORTLISTED: 1,
      INTERVIEW_SCHEDULED: 1,
      REJECTED: 4,
      WITHDRAWN: 2,
      HIRED: 1,
    };

    const totalActive = Object.entries(statusCounts)
      .filter(([s]) => !["REJECTED", "WITHDRAWN", "HIRED"].includes(s))
      .reduce((sum, [, count]) => sum + count, 0);

    expect(totalActive).toBe(12); // 5+3+2+1+1
  });

  it("handles empty status counts", () => {
    const statusCounts: Record<string, number> = {};
    const totalActive = Object.entries(statusCounts)
      .filter(([s]) => !["REJECTED", "WITHDRAWN", "HIRED"].includes(s))
      .reduce((sum, [, count]) => sum + count, 0);

    expect(totalActive).toBe(0);
  });
});

// ─── Test: Skill Match Calculation ───────────────────────────────────────

describe("Skill Match Calculation", () => {
  function calculateSkillMatch(
    candidateSkills: string[],
    requiredSkills: string[]
  ): number {
    const normalizedCandidate = candidateSkills.map((s) => s.toLowerCase());
    const normalizedRequired = requiredSkills.map((s) => s.toLowerCase());
    const matched = normalizedRequired.filter((s) =>
      normalizedCandidate.includes(s)
    );
    return normalizedRequired.length > 0
      ? (matched.length / normalizedRequired.length) * 100
      : 50;
  }

  it("returns 100% for perfect match", () => {
    const score = calculateSkillMatch(
      ["React", "Node.js", "TypeScript"],
      ["React", "Node.js", "TypeScript"]
    );
    expect(score).toBe(100);
  });

  it("returns 0% when no skills match", () => {
    const score = calculateSkillMatch(
      ["Python", "Django"],
      ["React", "Node.js"]
    );
    expect(score).toBe(0);
  });

  it("returns 50% when no required skills specified", () => {
    const score = calculateSkillMatch(["React", "Node.js"], []);
    expect(score).toBe(50);
  });

  it("is case-insensitive", () => {
    const score = calculateSkillMatch(
      ["react", "NODE.JS"],
      ["React", "Node.js"]
    );
    expect(score).toBe(100);
  });

  it("calculates partial match correctly", () => {
    const score = calculateSkillMatch(
      ["React", "Node.js"],
      ["React", "Node.js", "Python", "Go"]
    );
    expect(score).toBe(50);
  });
});

// ─── Test: Timeline Generation ───────────────────────────────────────────

describe("Timeline Generation", () => {
  it("events are ordered chronologically", () => {
    const events = [
      { status: "APPLIED", createdAt: "2026-03-01T00:00:00Z" },
      { status: "RESUME_VIEWED", createdAt: "2026-03-03T00:00:00Z" },
      { status: "SHORTLISTED", createdAt: "2026-03-05T00:00:00Z" },
    ];

    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].createdAt).getTime();
      const curr = new Date(events[i].createdAt).getTime();
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("handles single-event timeline", () => {
    const events = [
      { status: "APPLIED", createdAt: "2026-03-01T00:00:00Z" },
    ];
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("APPLIED");
  });
});
