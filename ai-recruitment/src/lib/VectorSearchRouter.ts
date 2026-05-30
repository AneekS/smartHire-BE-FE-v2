import { hybridRetrieve, type HybridHit } from "@/retrieval/hybrid";

export type { HybridHit };

export interface HybridSearchOptions {
  topK?: number;
  tenantId?: string;
  resumeVersionId?: string;
  candidateId?: string;
}

function buildTenantFilter(options: HybridSearchOptions): string | undefined {
  const clauses: string[] = [];
  if (options.tenantId) {
    clauses.push(`tenantId eq '${options.tenantId.replace(/'/g, "''")}'`);
  }
  if (options.resumeVersionId) {
    clauses.push(
      `resumeVersionId eq '${options.resumeVersionId.replace(/'/g, "''")}'`
    );
  }
  if (options.candidateId) {
    clauses.push(`candidateId eq '${options.candidateId.replace(/'/g, "''")}'`);
  }
  if (!clauses.length) return undefined;
  return clauses.join(" and ");
}

/** Hybrid vector + keyword search via Azure AI Search with RRF fusion. */
export class VectorSearchRouter {
  static async hybridSearch(
    queryText: string,
    queryVector: number[],
    options: HybridSearchOptions = {}
  ): Promise<HybridHit[]> {
    const filter = buildTenantFilter(options);
    return hybridRetrieve(queryText, queryVector, {
      topK: options.topK ?? 10,
      filter,
    });
  }
}

export const hybridSearch = VectorSearchRouter.hybridSearch.bind(VectorSearchRouter);
