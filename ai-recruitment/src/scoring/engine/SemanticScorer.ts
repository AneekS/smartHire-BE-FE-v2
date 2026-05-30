import { isSearchConfigured } from "@/embedding/search";
import { SEMANTIC_SECTION_WEIGHTS } from "@/scoring/constants";
import { semanticFallbackScore } from "@/scoring/engine/SemanticFallback";
import {
  aggregateVectors,
  cosineSimilarity,
  deterministicEmbed,
} from "@/scoring/engine/vector-utils";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail, ScoringContext } from "@/scoring/types";

function heuristicSemantic(resume: ResumeSchemaType, jd: JobSchemaType): number {
  const terms = [
    jd.title,
    jd.description ?? "",
    ...jd.requiredSkills.map((s) => s.skillName),
    ...jd.keyResponsibilities,
    ...jd.mustHaveKeywords,
  ]
    .join(" ")
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  const unique = [...new Set(terms)];
  if (!unique.length) return 50;
  const blob = [
    resume.summary ?? "",
    resume.currentTitle ?? "",
    ...resume.skills.map((s) => s.skillName),
    ...resume.experience.flatMap((e) => [
      e.title,
      e.company,
      ...e.achievements.map((a) => a.description),
    ]),
  ]
    .join(" ")
    .toLowerCase();
  const hits = unique.filter((t) => blob.includes(t)).length;
  return Math.min(100, Math.round((hits / unique.length) * 100));
}

function buildJobText(job: JobSchemaType): string {
  return [
    job.title,
    job.description,
    ...job.requiredSkills.map((s) => s.skillName),
    ...job.keyResponsibilities,
  ].join(" ");
}

function scoreFromVectors(
  resumeVectors: Array<{ section: string; vector: number[] }>,
  jobVector: number[]
): number {
  const items = resumeVectors.map(({ section, vector }) => ({
    vector,
    weight: SEMANTIC_SECTION_WEIGHTS[section] ?? 0.5,
  }));

  const resumeAggregate = aggregateVectors(items);
  if (!resumeAggregate) return 0;
  const similarity = cosineSimilarity(resumeAggregate, jobVector);
  return Math.min(100, Math.round(Math.max(0, similarity) * 100));
}

/** Fetch pre-indexed vectors from Azure Search (read-only, no embedding API). */
export async function fetchResumeVectorsFromSearch(
  resumeVersionId: string,
  tenantId: string
): Promise<Array<{ section: string; vector: number[] }>> {
  const configured = await isSearchConfigured().catch(() => false);
  if (!configured) return [];

  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const key = process.env.AZURE_SEARCH_ADMIN_KEY;
  const indexName = process.env.AZURE_SEARCH_INDEX ?? "resumes-index";
  if (!endpoint || !key) return [];

  const filter = encodeURIComponent(
    `resumeVersionId eq '${resumeVersionId.replace(/'/g, "''")}' and tenantId eq '${tenantId.replace(/'/g, "''")}'`
  );

  const res = await fetch(
    `${endpoint}/indexes/${indexName}/docs?api-version=2024-07-01&$filter=${filter}&$select=section,contentVector&$top=50`,
    {
      headers: { "Content-Type": "application/json", "api-key": key },
    }
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    value?: Array<{ section?: string; contentVector?: number[] }>;
  };

  return (data.value ?? [])
    .filter((row) => row.contentVector?.length)
    .map((row) => ({
      section: String(row.section ?? "FULL_TEXT"),
      vector: row.contentVector as number[],
    }));
}

export async function scoreSemanticMatch(ctx: ScoringContext): Promise<ComponentDetail> {
  const { resume, job, resumeVectors: preloaded } = ctx;

  let resumeVectors = preloaded ?? [];
  if (!resumeVectors.length && ctx.resumeVersionId && ctx.tenantId) {
    resumeVectors = await fetchResumeVectorsFromSearch(ctx.resumeVersionId, ctx.tenantId);
  }

  const jobText = buildJobText(job);
  const jobVector = deterministicEmbed(jobText);

  if (resumeVectors.length > 0) {
    const score = scoreFromVectors(resumeVectors, jobVector);
    return {
      score,
      reason: `Cosine similarity on ${resumeVectors.length} pre-computed section vectors: ${score}/100`,
    };
  }

  const resumeText = [
    resume.summary,
    resume.currentTitle,
    ...resume.skills.map((s) => s.skillName),
    ...resume.experience.flatMap((e) => e.achievements.map((a) => a.description)),
  ]
    .filter(Boolean)
    .join(" ");

  const resumeVector = deterministicEmbed(resumeText);
  const hashScore = Math.min(
    100,
    Math.round(Math.max(0, cosineSimilarity(resumeVector, jobVector)) * 100)
  );

  if (hashScore > 0) {
    return {
      score: hashScore,
      reason: `Deterministic hash-vector cosine alignment: ${hashScore}/100`,
    };
  }

  const fallback = await semanticFallbackScore(resume, job);
  if (fallback != null) {
    return { score: fallback, reason: `GPT-4o-mini semantic fallback: ${fallback}/100` };
  }

  const heuristic = heuristicSemantic(resume, job);
  return { score: heuristic, reason: `Keyword overlap heuristic: ${heuristic}/100` };
}
