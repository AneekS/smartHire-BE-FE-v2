import type { ScoreBreakdown, ScoreComponentKey } from "@/models/scoring.schema";
import type { IndustryWeightProfile } from "@/scoring/v3/industry-weights";
import type { ComponentDetail, ComponentScoresV3 } from "@/scoring/v3/types";

export function buildScoreBreakdown(
  components: ComponentScoresV3,
  weights: IndustryWeightProfile,
  details: Partial<Record<keyof ComponentScoresV3, ComponentDetail>>
): ScoreBreakdown {
  const breakdown = {} as ScoreBreakdown;
  for (const key of Object.keys(components) as ScoreComponentKey[]) {
    const score = components[key as keyof ComponentScoresV3] ?? 0;
    const weightPct = Math.round((weights[key as keyof IndustryWeightProfile] ?? 0) * 100);
    const detail = details[key as keyof ComponentScoresV3];
    breakdown[key] = {
      score,
      weight: weightPct,
      contribution: Math.round((score * weightPct) / 100),
      reason: detail?.reason ?? `${key} scored ${score}/100`,
      matched: detail?.matched,
      missing: detail?.missing,
      bonus: detail?.bonus,
    };
  }
  return breakdown;
}
