import { ollamaChat, parseJsonFromModel } from "@/lib/ollama-client";
import { EXPLAIN_SCORE_PROMPT } from "@/parsing/prompts";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { JobSchemaType } from "@/models/job.schema";
import type {
  ScoreBreakdown,
  ScoreComponentBreakdown,
  ScoreComponentKey,
  ScoreResult,
} from "@/models/scoring.schema";
import {
  scoreToGrade,
  scoreToRecommendation,
} from "@/models/scoring.schema";
import type { WeightProfile } from "@/scoring/weights";
import type { MatchContext } from "@/retrieval/context-assembler";

export interface ComponentScores {
  semanticMatch: number;
  skillMatch: number;
  experienceMatch: number;
  seniorityBand: number;
  educationMatch: number;
  achievementScore: number;
}

export interface SkillMatchDetail {
  matched: string[];
  missing: string[];
  bonus: string[];
}

export class ScoreExplainer {
  static buildBreakdown(
    components: ComponentScores,
    weights: WeightProfile,
    details: {
      skill: SkillMatchDetail;
      semanticReason?: string;
      seniorityReason?: string;
      experienceReason?: string;
      achievementReason?: string;
      educationReason?: string;
      flags: string[];
    }
  ): ScoreBreakdown {
    const keys: ScoreComponentKey[] = [
      "semanticMatch",
      "skillMatch",
      "experienceMatch",
      "seniorityBand",
      "educationMatch",
      "achievementScore",
    ];

    const breakdown = {} as ScoreBreakdown;

    for (const key of keys) {
      const score = components[key];
      const weight = weights[key];
      const contribution = Math.round((score * weight) / 100);
      let reason = "";
      let matched: string[] | undefined;
      let missing: string[] | undefined;
      let bonus: string[] | undefined;

      switch (key) {
        case "semanticMatch":
          reason =
            details.semanticReason ??
            `Resume content alignment with job description scored ${score}/100.`;
          break;
        case "skillMatch":
          matched = details.skill.matched;
          missing = details.skill.missing;
          bonus = details.skill.bonus;
          reason = `Matched ${matched.length} required skill(s)${
            missing.length ? `; missing ${missing.join(", ")}` : ""
          }${bonus.length ? `; bonus: ${bonus.join(", ")}` : ""}. Score: ${score}/100.`;
          break;
        case "experienceMatch":
          reason =
            details.experienceReason ??
            `Years and relevance of experience scored ${score}/100.`;
          break;
        case "seniorityBand":
          reason =
            details.seniorityReason ??
            `Seniority band alignment scored ${score}/100.`;
          break;
        case "educationMatch":
          reason =
            details.educationReason ??
            `Education vs job requirement scored ${score}/100.`;
          break;
        case "achievementScore":
          reason =
            details.achievementReason ??
            `Quantified achievements scored ${score}/100.`;
          break;
      }

      breakdown[key] = {
        score,
        weight,
        contribution,
        reason,
        matched,
        missing,
        bonus,
      } satisfies ScoreComponentBreakdown;
    }

    return breakdown;
  }

  static buildResult(input: {
    overallScore: number;
    components: ComponentScores;
    weights: WeightProfile;
    scoreBreakdown: ScoreBreakdown;
    dealbreakers: string[];
    flags: string[];
    matchedSkills: string[];
    missingSkills: string[];
    explanation?: string;
  }): ScoreResult {
    const entries = Object.entries(input.scoreBreakdown) as [
      ScoreComponentKey,
      ScoreComponentBreakdown,
    ][];
    const sorted = [...entries].sort((a, b) => b[1].contribution - a[1].contribution);

    const topStrengths = sorted
      .filter(([, v]) => v.contribution >= 8)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v.reason}`);

    const topGaps = sorted
      .filter(([, v]) => v.score < 60)
      .slice(-3)
      .reverse()
      .map(([k, v]) => `${k}: ${v.reason}`);

    const recommendation = scoreToRecommendation(
      input.overallScore,
      input.dealbreakers
    );

    return {
      overallScore: input.overallScore,
      grade: scoreToGrade(input.overallScore),
      recommendation,
      scoreBreakdown: input.scoreBreakdown,
      dealbreakers: input.dealbreakers,
      flags: input.flags,
      topStrengths,
      topGaps,
      matchedSkills: input.matchedSkills,
      missingSkills: input.missingSkills,
      explanation: input.explanation,
      reasons: topStrengths.length ? topStrengths : [sorted[0]?.[1]?.reason ?? ""],
    };
  }
}

export async function explainScore(
  context: MatchContext
): Promise<Partial<ScoreResult>> {
  try {
    const payload = {
      resumeSummary: context.resumeSummary,
      jobTitle: context.job.title,
      industryDomain: context.job.industryDomain,
      requiredSkills: context.job.requiredSkills.map((s) => s.skillName),
      matchedSkills: context.matchedSkills,
      missingSkills: context.missingSkills,
      dealbreakers: context.dealbreakers,
      topChunks: context.topChunks.map((c) => c.content.slice(0, 300)),
    };

    const content = await ollamaChat(
      EXPLAIN_SCORE_PROMPT,
      JSON.stringify(payload, null, 2)
    );
    const obj = parseJsonFromModel(content) as Partial<ScoreResult>;
    return {
      explanation: obj.explanation,
      reasons: obj.reasons ?? [],
      missingSkills: obj.missingSkills ?? context.missingSkills,
      matchedSkills: obj.matchedSkills ?? context.matchedSkills,
    };
  } catch (e) {
    console.warn("[explainer] fallback:", e);
    return {
      explanation: "Match assessment based on skill overlap and experience alignment.",
      reasons: [
        `${context.matchedSkills.length} required skills matched`,
        `${context.missingSkills.length} skills missing`,
      ],
      matchedSkills: context.matchedSkills,
      missingSkills: context.missingSkills,
    };
  }
}
