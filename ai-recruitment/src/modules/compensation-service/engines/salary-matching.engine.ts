type SalaryMatchInput = {
  userMinSalary: number;
  userMaxSalary: number;
  userIsNegotiable: boolean;
  marketAvgSalary?: number | null;
  marketP75Salary?: number | null;
  jobMinSalary?: number | null;
  jobMaxSalary?: number | null;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function overlapScore(input: SalaryMatchInput): number {
  const minA = input.userMinSalary;
  const maxA = input.userMaxSalary;
  const minB = input.jobMinSalary ?? input.jobMaxSalary ?? 0;
  const maxB = input.jobMaxSalary ?? input.jobMinSalary ?? 0;
  if (!maxB && !minB) return 0.5;

  const overlap = Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
  const userRange = Math.max(1, maxA - minA);
  if (overlap >= userRange) return 1;
  if (overlap > 0) return 0.5;
  return 0;
}

function marketAlignment(input: SalaryMatchInput): number {
  const anchor = input.marketAvgSalary ?? input.marketP75Salary;
  if (!anchor) return 0.5;
  const userMid = (input.userMinSalary + input.userMaxSalary) / 2;
  const gapRatio = Math.abs(userMid - anchor) / Math.max(anchor, 1);
  return clamp(1 - gapRatio);
}

function negotiationFactor(input: SalaryMatchInput): number {
  return input.userIsNegotiable ? 1 : 0.4;
}

export function computeSalaryMatchScore(input: SalaryMatchInput): {
  score: number;
  explanation: string;
  components: {
    overlap: number;
    marketAlignment: number;
    negotiation: number;
  };
} {
  const overlap = overlapScore(input);
  const market = marketAlignment(input);
  const negotiation = negotiationFactor(input);

  const score = clamp(overlap * 0.6 + market * 0.3 + negotiation * 0.1);

  const explanationParts = [
    overlap === 1 ? "salary range fully overlaps" : overlap === 0.5 ? "salary range partially overlaps" : "salary range does not overlap",
    market >= 0.75 ? "market aligned" : market >= 0.4 ? "near market band" : "far from market benchmark",
    input.userIsNegotiable ? "candidate marked negotiable" : "candidate not negotiable",
  ];

  return {
    score: Number(score.toFixed(3)),
    explanation: explanationParts.join("; "),
    components: {
      overlap: Number(overlap.toFixed(3)),
      marketAlignment: Number(market.toFixed(3)),
      negotiation: Number(negotiation.toFixed(3)),
    },
  };
}
