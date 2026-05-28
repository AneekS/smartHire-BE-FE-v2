import { prisma } from "@/lib/db";
import { SectionChunker } from "@/embedding/chunker";
import { BatchEmbedder } from "@/embedding/embedder";
import {
  chunkToSearchDoc,
  deleteResumeChunks,
  isSearchConfigured,
  upsertSearchDocuments,
} from "@/embedding/search";
import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";
import type { EmbedJobPayload } from "@/queue/redis-queue";
import { updatePipelineStatus, markPipelineFailed } from "@/lib/pipeline-status";
import { logExtractionEvent } from "@/monitoring/logger";

export async function embedChunksJob(payload: EmbedJobPayload): Promise<{ indexed: number }> {
  const { resumeId, candidateId, tenantId } = payload;
  const started = Date.now();

  try {
    await updatePipelineStatus(resumeId, "EMBEDDING");

    const version = await prisma.resumeVersion.findUnique({
      where: { id: resumeId },
      include: { parsedResume: true },
    });

    if (!version) {
      throw new Error(`ResumeVersion ${resumeId} not found`);
    }

    const rawText = version.pipelineRawText;
    const extraction = version.parsedResume?.extractionSchema as
      | ExtractionResumeSchemaType
      | null
      | undefined;

    if (!rawText || !extraction) {
      throw new Error(`Missing raw text or extraction schema for resume ${resumeId}`);
    }

    if (!(await isSearchConfigured())) {
      await prisma.resumeVersion.update({
        where: { id: resumeId },
        data: {
          pipelineStatus: "COMPLETE",
          embeddedAt: new Date(),
        },
      });
      return { indexed: 0 };
    }

    await deleteResumeChunks(resumeId);
    const chunks = SectionChunker.chunk(
      rawText,
      extraction,
      resumeId,
      candidateId,
      tenantId ?? version.tenantId ?? candidateId
    );
    if (!chunks.length) {
      await prisma.resumeVersion.update({
        where: { id: resumeId },
        data: {
          pipelineStatus: "COMPLETE",
          embeddedAt: new Date(),
        },
      });
      return { indexed: 0 };
    }

    const embeddings = await BatchEmbedder.embedAll(chunks.map((c) => c.content));
    const docs = chunks.map((chunk, i) => chunkToSearchDoc(chunk, embeddings[i]));
    await upsertSearchDocuments(docs);

    await prisma.resumeVersion.update({
      where: { id: resumeId },
      data: {
        pipelineStatus: "EMBEDDED",
        embeddedAt: new Date(),
      },
    });

    await updatePipelineStatus(resumeId, "COMPLETE");

    logExtractionEvent({
      event: "embedding_complete",
      resume_id: resumeId,
      tenant_id: tenantId ?? null,
      pass_number: null,
      duration_ms: Date.now() - started,
      confidence: null,
      field_count: docs.length,
      error: null,
    });

    return { indexed: docs.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Embed stage failed";
    await markPipelineFailed(resumeId, msg);
    throw e;
  }
}

/** Inline embed for sync pipeline (no queue). */
export async function runEmbedStageInline(
  resumeId: string,
  candidateId: string
): Promise<{ indexed: number }> {
  return embedChunksJob({ resumeId, candidateId });
}
