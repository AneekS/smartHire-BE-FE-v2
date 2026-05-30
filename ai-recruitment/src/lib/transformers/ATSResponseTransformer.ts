import type { ScoreComponentKey } from "@/models/scoring.schema";
import {
  scoreLabelFromRecommendation,
  type Recommendation,
} from "@/models/scoring.schema";
import { SCORE_COMPONENTS } from "@/feedback/types";
import { getIndustryWeights, resolveIndustry } from "@/scoring/constants";
import type {
  AtsBreakdown,
  AtsBreakdownComponent,
  ChartDataPoint,
  JobAtsScore,
  SkillGap,
} from "@/types/ats.types";

const V2_COMPONENT_MAP: Array<{
  key: ScoreComponentKey;
  scoreField: string;
}> = [
  { key: "semanticMatch", scoreField: "semanticScore" },
  { key: "skillMatch", scoreField: "skillScore" },
  { key: "experienceMatch", scoreField: "experienceScore" },
  { key: "atsCompliance", scoreField: "complianceScore" },
  { key: "projectRelevance", scoreField: "projectScore" },
  { key: "educationMatch", scoreField: "educationScore" },
  { key: "resumeQuality", scoreField: "qualityScore" },
];

const CHART_FILLS: Partial<Record<ScoreComponentKey, string>> = {
  semanticMatch: "#8b5cf6",
  skillMatch: "#6366f1",
  experienceMatch: "#3b82f6",
  atsCompliance: "#14b8a6",
  projectRelevance: "#22c55e",
  educationMatch: "#eab308",
  resumeQuality: "#f97316",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapScoreInput(score: unknown): Record<string, unknown> {
  if (!isRecord(score)) return {};
  if (isRecord(score.data)) {
    if (isRecord(score.data.data)) return score.data.data;
    return score.data;
  }
  return score;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function firstNonEmpty(...arrays: string[][]): string[] {
  for (const arr of arrays) {
    if (arr.length > 0) return arr;
  }
  return [];
}

function parseDetails(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeBreakdownEntry(
  entry: unknown,
  weightFraction: number
): AtsBreakdownComponent | null {
  if (!isRecord(entry)) return null;
  const score = asNumber(entry.score);
  const weightPct =
    typeof entry.weight === "number"
      ? entry.weight <= 1
        ? Math.round(entry.weight * 100)
        : entry.weight
      : Math.round(weightFraction * 100);
  const contribution =
    typeof entry.contribution === "number"
      ? entry.contribution
      : (score * weightPct) / 100;
  return {
    score,
    weight: weightPct,
    contribution,
    reason: typeof entry.reason === "string" ? entry.reason : "",
    matched: asStringArray(entry.matched),
    missing: asStringArray(entry.missing),
    bonus: asStringArray(entry.bonus),
  };
}

function extractBreakdown(
  raw: Record<string, unknown>,
  industryProfile?: string | null
): AtsBreakdown {
  const details = parseDetails(raw.details);
  const nestedResult = isRecord(raw.result) ? raw.result : {};
  const candidate =
    raw.scoreBreakdown ??
    raw.breakdown ??
    details.scoreBreakdown ??
    details.breakdown ??
    nestedResult.scoreBreakdown ??
    nestedResult.breakdown;

  if (isRecord(candidate)) {
    const breakdown: AtsBreakdown = {};
    for (const [key, value] of Object.entries(candidate)) {
      const normalized = normalizeBreakdownEntry(value, 0);
      if (normalized) breakdown[key as ScoreComponentKey] = normalized;
    }
    if (Object.keys(breakdown).length > 0) return breakdown;
  }

  const industry = resolveIndustry(
    (raw.industryProfile as string | undefined) ??
      (raw.industryDomain as string | undefined) ??
      industryProfile ??
      undefined
  );
  const weights = getIndustryWeights(industry);
  const breakdown: AtsBreakdown = {};

  for (const { key, scoreField } of V2_COMPONENT_MAP) {
    const scoreVal = raw[scoreField] ?? nestedResult[scoreField];
    if (scoreVal === undefined && scoreVal !== 0) continue;
    const weightFraction = weights[key] ?? 0;
    const score = asNumber(scoreVal);
    breakdown[key] = {
      score,
      weight: Math.round(weightFraction * 100),
      contribution: score * weightFraction,
      reason: "",
    };
  }

  return breakdown;
}

function isV2ApplicationScore(raw: Record<string, unknown>): boolean {
  return (
    typeof raw.finalScore === "number" &&
    (typeof raw.semanticScore === "number" ||
      typeof raw.skillScore === "number" ||
      Array.isArray(raw.skillGaps))
  );
}

function isLegacyListingScore(raw: Record<string, unknown>): boolean {
  return (
    typeof raw.score === "number" &&
    (raw.details !== undefined || raw.listingId !== undefined)
  );
}

function resolveScoreLabel(
  raw: Record<string, unknown>,
  details: Record<string, unknown> = {}
): string | undefined {
  if (typeof raw.scoreLabel === "string") return raw.scoreLabel;
  const recommendation = raw.recommendation ?? details.recommendation;
  if (
    recommendation === "STRONG_CONSIDER" ||
    recommendation === "CONSIDER" ||
    recommendation === "REVIEW" ||
    recommendation === "REJECT"
  ) {
    return scoreLabelFromRecommendation(recommendation as Recommendation);
  }
  return undefined;
}

function resolveFinalScore(raw: Record<string, unknown>): number {
  if (typeof raw.finalScore === "number") return raw.finalScore;
  if (typeof raw.overallScore === "number") return raw.overallScore;
  if (typeof raw.score === "number") return raw.score;
  const nested = isRecord(raw.result) ? raw.result : null;
  if (nested && typeof nested.overallScore === "number") return nested.overallScore;
  return 0;
}

function resolveConfidence(raw: Record<string, unknown>): number {
  if (typeof raw.confidence === "number") return raw.confidence;
  if (typeof raw.scoreConfidence === "number") return raw.scoreConfidence;
  const nested = isRecord(raw.result) ? raw.result : null;
  if (nested && typeof nested.scoreConfidence === "number") {
    return nested.scoreConfidence;
  }
  return 0.85;
}

export class ATSResponseTransformer {
  static toClientAts(score: unknown): JobAtsScore {
    const raw = unwrapScoreInput(score);
    const details = parseDetails(raw.details);
    const nestedResult = isRecord(raw.result) ? raw.result : {};
    const industryProfile =
      (raw.industryProfile as string | undefined) ??
      (raw.industryDomain as string | undefined) ??
      (details.industryDomain as string | undefined) ??
      "GENERAL";

    const breakdown = extractBreakdown(raw, industryProfile);
    const skillGaps = ATSResponseTransformer.toSkillGaps(raw);

    const matchedSkills = firstNonEmpty(
      asStringArray(raw.matchedSkills),
      asStringArray(nestedResult.matchedSkills),
      asStringArray(details.matchedSkills)
    );

    const missingSkills = firstNonEmpty(
      asStringArray(raw.missingSkills),
      asStringArray(nestedResult.missingSkills),
      asStringArray(details.missingSkills),
      skillGaps.map((g) => g.missingSkill)
    );

    const id =
      typeof raw.id === "string"
        ? raw.id
        : typeof raw.jobAtsScoreId === "string"
          ? raw.jobAtsScoreId
          : "";

    const skillScoreReliable = raw.skillScoreReliable !== false;
    const dealbreakers = firstNonEmpty(
      asStringArray(raw.dealbreakers),
      asStringArray(nestedResult.dealbreakers)
    );
    const finalScore = resolveFinalScore(raw);
    const baseFlags = firstNonEmpty(
      asStringArray(raw.flags),
      asStringArray(nestedResult.flags)
    );
    const dealbreakerCapApplied =
      raw.dealbreakerCapApplied === true ||
      (finalScore <= 30 && dealbreakers.length > 0);
    const flags = [
      ...baseFlags,
      ...(skillScoreReliable === false ? ["SKILL_MATCH_UNRELIABLE"] : []),
      ...(dealbreakerCapApplied ? ["DEALBREAKER_CAP_APPLIED"] : []),
    ];

    const client: JobAtsScore = {
      id,
      jobId:
        (typeof raw.jobId === "string" ? raw.jobId : undefined) ??
        (typeof details.jobId === "string" ? details.jobId : undefined),
      jobListingId:
        (typeof raw.listingId === "string" ? raw.listingId : null) ??
        (typeof raw.jobListingId === "string" ? raw.jobListingId : null),
      resumeVersionId:
        typeof raw.resumeVersionId === "string" ? raw.resumeVersionId : null,
      finalScore: resolveFinalScore(raw),
      confidence: resolveConfidence(raw),
      requiresManualReview: Boolean(
        raw.requiresManualReview ?? nestedResult.requiresManualReview ?? false
      ),
      skillScoreReliable,
      percentileRank:
        typeof raw.percentileRank === "number" ? raw.percentileRank : undefined,
      industryProfile,
      seniorityBand:
        (raw.seniorityBand as string | null | undefined) ?? null,
      breakdown,
      scoreBreakdown: breakdown,
      skillGaps,
      matchedSkills,
      missingSkills,
      grade:
        (typeof raw.grade === "string" ? raw.grade : undefined) ??
        (typeof nestedResult.grade === "string" ? nestedResult.grade : undefined),
      recommendation:
        typeof raw.recommendation === "string"
          ? raw.recommendation
          : typeof nestedResult.recommendation === "string"
            ? nestedResult.recommendation
            : undefined,
      scoreLabel: resolveScoreLabel({ ...nestedResult, ...raw }, details),
      matchSummary:
        (typeof raw.matchSummary === "string" ? raw.matchSummary : null) ??
        (typeof raw.explanation === "string" ? raw.explanation : null) ??
        (typeof nestedResult.explanation === "string"
          ? nestedResult.explanation
          : null),
      computedAt: toIsoString(raw.computedAt ?? raw.createdAt),
      pipeline:
        typeof raw.pipeline === "string"
          ? raw.pipeline
          : isV2ApplicationScore(raw)
            ? "application_ats_score"
            : isLegacyListingScore(raw)
              ? "job_ats_score"
              : undefined,
      flags: flags.length > 0 ? flags : undefined,
      cached: raw.cached === true,
    };

    if (isRecord(nestedResult) && Object.keys(nestedResult).length > 0) {
      Object.assign(client, nestedResult);
    }

    client.finalScore = resolveFinalScore(raw);
    client.overallScore = client.finalScore;

    return client;
  }

  static toBreakdownChart(score: unknown): ChartDataPoint[] {
    const client = ATSResponseTransformer.toClientAts(score);
    const breakdown = client.breakdown ?? client.scoreBreakdown ?? {};

    const keys = SCORE_COMPONENTS.filter(
      (key) => breakdown[key] !== undefined
    );
    const ordered = keys.length > 0 ? keys : Object.keys(breakdown);

    return ordered.map((key) => {
      const item = breakdown[key as ScoreComponentKey];
      if (!item) {
        return { name: key, score: 0, weight: 0 };
      }
      return {
        name: key,
        score: item.score,
        weight: item.weight,
        fill: CHART_FILLS[key as ScoreComponentKey],
      };
    });
  }

  static toSkillGaps(score: unknown): SkillGap[] {
    const raw = unwrapScoreInput(score);
    const gapsRaw = raw.skillGaps ?? raw.skill_gaps;

    if (Array.isArray(gapsRaw)) {
      return gapsRaw
        .map((gap): SkillGap | null => {
          if (!isRecord(gap)) return null;
          const missingSkill =
            typeof gap.missingSkill === "string"
              ? gap.missingSkill
              : typeof gap.skill === "string"
                ? gap.skill
                : "";
          if (!missingSkill) return null;
          return {
            missingSkill,
            importance: asNumber(gap.importance, 1),
            canonicalSkill:
              typeof gap.canonicalSkill === "string"
                ? gap.canonicalSkill
                : null,
          };
        })
        .filter((g): g is SkillGap => g !== null);
    }

    const missing = asStringArray(raw.missingSkills);
    const nested = isRecord(raw.result) ? raw.result : null;
    const nestedMissing = nested ? asStringArray(nested.missingSkills) : [];
    const combined = missing.length > 0 ? missing : nestedMissing;

    return combined.map((skill) => ({
      missingSkill: skill,
      importance: 1,
    }));
  }
}
