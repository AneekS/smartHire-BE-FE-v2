import { RRF_K } from "@/retrieval/constants";
import {
  keywordSearch,
  vectorSearch,
  type SearchHit,
} from "@/embedding/search";

export interface HybridHit extends SearchHit {
  fusedScore: number;
}

function reciprocalRankFusion(
  lists: SearchHit[][],
  k = RRF_K
): HybridHit[] {
  const scores = new Map<string, { hit: SearchHit; fusedScore: number }>();

  for (const list of lists) {
    list.forEach((hit, rank) => {
      const prev = scores.get(hit.id);
      const rrf = 1 / (k + rank + 1);
      if (prev) {
        prev.fusedScore += rrf;
      } else {
        scores.set(hit.id, { hit, fusedScore: rrf });
      }
    });
  }

  return [...scores.values()]
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .map(({ hit, fusedScore }) => ({ ...hit, fusedScore }));
}

export async function hybridRetrieve(
  queryText: string,
  queryVector: number[],
  options: {
    topK?: number;
    filter?: string;
  } = {}
): Promise<HybridHit[]> {
  const topK = options.topK ?? 10;
  const filter = options.filter;

  const [vectorHits, keywordHits] = await Promise.all([
    vectorSearch(queryVector, { topK, filter }).catch(() => [] as SearchHit[]),
    keywordSearch(queryText, { topK, filter }).catch(() => [] as SearchHit[]),
  ]);

  return reciprocalRankFusion([vectorHits, keywordHits]).slice(0, topK);
}
