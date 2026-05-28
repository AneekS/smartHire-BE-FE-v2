import { SectionChunker } from "@/embedding/chunker";
import { BatchEmbedder } from "@/embedding/embedder";
import {
  chunkToSearchDoc,
  deleteResumeChunks,
  isSearchConfigured,
  upsertSearchDocuments,
} from "@/embedding/search";
import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";

export async function indexResumeInSearch(
  params: {
    rawText: string;
    extraction: ExtractionResumeSchemaType;
    resumeVersionId: string;
    candidateId: string;
    tenantId?: string;
    legacyResume?: ResumeSchemaType;
  }
): Promise<{ indexed: number; skipped: boolean }> {
  if (!(await isSearchConfigured())) {
    return { indexed: 0, skipped: true };
  }

  const { rawText, extraction, resumeVersionId, candidateId } = params;

  await deleteResumeChunks(resumeVersionId);
  const chunks = SectionChunker.chunk(
    rawText,
    extraction,
    resumeVersionId,
    candidateId,
    params.tenantId ?? candidateId
  );
  if (!chunks.length) return { indexed: 0, skipped: false };

  const embeddings = await BatchEmbedder.embedAll(chunks.map((c) => c.content));
  const docs = chunks.map((chunk, i) => chunkToSearchDoc(chunk, embeddings[i]));
  await upsertSearchDocuments(docs);
  return { indexed: docs.length, skipped: false };
}
