import { getPipelineEnv } from "@/config/pipeline-env";
import { OLLAMA_EMBED_MODEL } from "@/config/ollama-models";
import type { ResumeChunk } from "@/embedding/SectionChunker";
import type { EmbedResult } from "@/embedding/BatchEmbedder";

export interface SearchDocument {
  id: string;
  tenantId: string;
  resumeVersionId: string;
  candidateId: string;
  section: string;
  docType: string;
  content: string;
  contentVector: number[];
  embeddingModel: string;
  skills: string[];
  seniorityBand?: string;
  industryDomain: string;
  totalYearsExp?: number;
  chunkCount?: number;
  updatedAt: string;
}

export interface SearchHit {
  id: string;
  content: string;
  section: string;
  resumeVersionId: string;
  candidateId: string;
  tenantId: string;
  score: number;
  skills: string[];
}

export interface DriftSampleDocument {
  id: string;
  content: string;
  contentVector: number[];
  resumeVersionId: string;
  updatedAt: string;
}

function getSearchConfig() {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const key = process.env.AZURE_SEARCH_ADMIN_KEY;
  const indexName = getPipelineEnv().AZURE_SEARCH_INDEX;
  if (!endpoint || !key) {
    throw new Error("Azure Search not configured (AZURE_SEARCH_ENDPOINT / AZURE_SEARCH_ADMIN_KEY)");
  }
  return { endpoint, key, indexName };
}

async function searchFetch(path: string, init?: RequestInit): Promise<Response> {
  const { endpoint, key } = getSearchConfig();
  return fetch(`${endpoint}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "api-key": key,
      ...(init?.headers ?? {}),
    },
  });
}

export class AzureSearchIndexer {
  static chunkToDocument(
    chunk: ResumeChunk,
    embed: EmbedResult,
    chunkCount?: number
  ): SearchDocument {
    return {
      id: chunk.id,
      tenantId: chunk.tenantId,
      resumeVersionId: chunk.resumeVersionId,
      candidateId: chunk.candidateId,
      section: chunk.section,
      docType: chunk.docType,
      content: chunk.content,
      contentVector: embed.vector,
      embeddingModel:
        embed.embeddingModel ?? getPipelineEnv().OLLAMA_EMBED_MODEL ?? OLLAMA_EMBED_MODEL,
      skills: chunk.skills,
      seniorityBand: chunk.seniorityBand,
      industryDomain: chunk.industryDomain,
      totalYearsExp: chunk.totalYearsExp,
      chunkCount,
      updatedAt: new Date().toISOString(),
    };
  }

  static async upsertDocuments(docs: SearchDocument[]): Promise<void> {
    if (docs.length === 0) return;
    const { indexName } = getSearchConfig();
    const res = await searchFetch(
      `/indexes/${indexName}/docs/index?api-version=2024-07-01`,
      {
        method: "POST",
        body: JSON.stringify({
          value: docs.map((d) => ({ "@search.action": "mergeOrUpload", ...d })),
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Azure Search upsert failed: ${res.status} ${body}`);
    }
  }

  static async deleteResumeChunks(resumeVersionId: string): Promise<void> {
    const { indexName } = getSearchConfig();
    const filter = encodeURIComponent(`resumeVersionId eq '${resumeVersionId}'`);
    const res = await searchFetch(
      `/indexes/${indexName}/docs?api-version=2024-07-01&$filter=${filter}&$select=id`,
      { method: "GET" }
    );
    if (!res.ok) return;

    const data = (await res.json()) as { value?: { id: string }[] };
    const ids = data.value ?? [];
    if (!ids.length) return;

    await searchFetch(`/indexes/${indexName}/docs/index?api-version=2024-07-01`, {
      method: "POST",
      body: JSON.stringify({
        value: ids.map((row) => ({ "@search.action": "delete", id: row.id })),
      }),
    });
  }

  static async isConfigured(): Promise<boolean> {
    return Boolean(
      process.env.AZURE_SEARCH_ENDPOINT && process.env.AZURE_SEARCH_ADMIN_KEY
    );
  }
}

export function chunkToSearchDoc(
  chunk: ResumeChunk,
  embed: EmbedResult,
  chunkCount?: number
): SearchDocument {
  return AzureSearchIndexer.chunkToDocument(chunk, embed, chunkCount);
}

export async function upsertSearchDocuments(docs: SearchDocument[]): Promise<void> {
  return AzureSearchIndexer.upsertDocuments(docs);
}

export async function deleteResumeChunks(resumeVersionId: string): Promise<void> {
  return AzureSearchIndexer.deleteResumeChunks(resumeVersionId);
}

export async function isSearchConfigured(): Promise<boolean> {
  return AzureSearchIndexer.isConfigured();
}

export function buildSearchFilter(params: {
  tenantId?: string;
  candidateId?: string;
  docType?: string;
}): string | undefined {
  const parts: string[] = [];
  if (params.tenantId) {
    parts.push(`tenantId eq '${params.tenantId.replace(/'/g, "''")}'`);
  }
  if (params.candidateId) {
    parts.push(`candidateId eq '${params.candidateId.replace(/'/g, "''")}'`);
  }
  if (params.docType) {
    parts.push(`docType eq '${params.docType.replace(/'/g, "''")}'`);
  }
  return parts.length ? parts.join(" and ") : undefined;
}

export async function vectorSearch(
  queryVector: number[],
  options: { topK?: number; filter?: string } = {}
): Promise<SearchHit[]> {
  const { indexName } = getSearchConfig();
  const topK = options.topK ?? 10;

  const body: Record<string, unknown> = {
    vectorQueries: [
      {
        kind: "vector",
        vector: queryVector,
        fields: "contentVector",
        k: topK,
      },
    ],
    select: "id,content,section,resumeVersionId,candidateId,tenantId,skills",
    top: topK,
  };
  if (options.filter) body.filter = options.filter;

  const res = await searchFetch(
    `/indexes/${indexName}/docs/search?api-version=2024-07-01`,
    { method: "POST", body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure Search query failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    value?: Array<Record<string, unknown> & { "@search.score"?: number }>;
  };

  return (data.value ?? []).map((row) => ({
    id: String(row.id),
    content: String(row.content ?? ""),
    section: String(row.section ?? ""),
    resumeVersionId: String(row.resumeVersionId ?? ""),
    candidateId: String(row.candidateId ?? ""),
    tenantId: String(row.tenantId ?? ""),
    skills: (row.skills as string[]) ?? [],
    score: Number(row["@search.score"] ?? 0),
  }));
}

export async function keywordSearch(
  query: string,
  options: { topK?: number; filter?: string } = {}
): Promise<SearchHit[]> {
  const { indexName } = getSearchConfig();
  const topK = options.topK ?? 10;

  const body: Record<string, unknown> = {
    search: query,
    select: "id,content,section,resumeVersionId,candidateId,tenantId,skills",
    top: topK,
  };
  if (options.filter) body.filter = options.filter;

  const res = await searchFetch(
    `/indexes/${indexName}/docs/search?api-version=2024-07-01`,
    { method: "POST", body: JSON.stringify(body) }
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    value?: Array<Record<string, unknown> & { "@search.score"?: number }>;
  };

  return (data.value ?? []).map((row) => ({
    id: String(row.id),
    content: String(row.content ?? ""),
    section: String(row.section ?? ""),
    resumeVersionId: String(row.resumeVersionId ?? ""),
    candidateId: String(row.candidateId ?? ""),
    tenantId: String(row.tenantId ?? ""),
    skills: (row.skills as string[]) ?? [],
    score: Number(row["@search.score"] ?? 0),
  }));
}

export async function sampleRecentDocuments(options: {
  since: Date;
  limit: number;
}): Promise<DriftSampleDocument[]> {
  const { indexName } = getSearchConfig();
  const sinceIso = options.since.toISOString();
  const filter = `updatedAt ge ${sinceIso}`;
  const collected: DriftSampleDocument[] = [];
  let skip = 0;
  const pageSize = 100;

  while (collected.length < options.limit) {
    const body = {
      search: "*",
      filter,
      select: "id,content,contentVector,resumeVersionId,updatedAt",
      top: pageSize,
      skip,
    };

    const res = await searchFetch(
      `/indexes/${indexName}/docs/search?api-version=2024-07-01`,
      { method: "POST", body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Azure Search sample failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { value?: Array<Record<string, unknown>> };
    const page = data.value ?? [];
    if (page.length === 0) break;

    for (const row of page) {
      const vector = row.contentVector as number[] | undefined;
      const content = String(row.content ?? "");
      if (!vector?.length || !content) continue;
      collected.push({
        id: String(row.id),
        content,
        contentVector: vector,
        resumeVersionId: String(row.resumeVersionId ?? ""),
        updatedAt: String(row.updatedAt ?? ""),
      });
    }

    skip += page.length;
    if (page.length < pageSize) break;
  }

  return collected;
}
