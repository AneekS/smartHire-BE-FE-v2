import type { ApplicationAtsScore, Prisma } from "@prisma/client";

export type AtsComputeResult = ApplicationAtsScore & {
  skillGaps: Prisma.AtsSkillGapGetPayload<object>[];
  careerReadiness: Prisma.CareerReadinessGetPayload<object> | null;
  skillScoreReliable: boolean;
  percentileRank?: number;
  dealbreakers: string[];
  dealbreakerCapApplied: boolean;
};
