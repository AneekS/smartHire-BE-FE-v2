import { prisma } from "@/lib/prisma";
import { getPipelineEnv } from "@/config/pipeline-env";
import { SectionChunker } from "@/embedding/SectionChunker";
import { EmbeddingService } from "@/embedding/EmbeddingService";
import {
  AzureSearchIndexer,
  chunkToSearchDoc,
} from "@/embedding/AzureSearchIndexer";
import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import type { EmbedJobPayload } from "@/queue/redis-queue";
import { updatePipelineStatus, markPipelineFailed } from "@/lib/pipeline-status";
import { logExtractionEvent } from "@/monitoring/logger";

async function upsertResumeSearchEmbedding(
  legacyResumeVersionId: string,
  tenantId: string,
  chunkCount: number,
  embeddingModel: string
): Promise<void> {
  const v2 = await prisma.resumeVersionV2.findFirst({
    where: { legacyResumeVersionId },
  });
  if (!v2) return;

  await prisma.resumeSearchEmbedding.upsert({
    where: { resumeVersionId: v2.id },
    create: {
      resumeVersionId: v2.id,
      tenantId,
      embeddingModel,
      vectorDimensions: getPipelineEnv().EMBED_VECTOR_DIMENSIONS,
      chunkCount,
    },
    update: {
      embeddingModel,
      chunkCount,
      vectorDimensions: getPipelineEnv().EMBED_VECTOR_DIMENSIONS,
    },
  });
}

export async function runEmbedStage(payload: EmbedJobPayload): Promise<{ indexed: number }> {
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

    const resolvedTenant = tenantId ?? version.tenantId ?? candidateId;

    try {
      const { ensureResumeV2Bridge } = await import("@/lib/resume-v2-bridge");
      await ensureResumeV2Bridge({
        legacyResumeVersionId: resumeId,
        candidateId,
        tenantId: resolvedTenant,
      });
    } catch (bridgeErr) {
      console.warn("[embed-stage] resume v2 bridge skipped:", bridgeErr);
    }

    if (!(await AzureSearchIndexer.isConfigured())) {
      await prisma.resumeVersion.update({
        where: { id: resumeId },
        data: { pipelineStatus: "COMPLETE", embeddedAt: new Date() },
      });
      return { indexed: 0 };
    }

    await AzureSearchIndexer.deleteResumeChunks(resumeId);
    const chunks = SectionChunker.chunk(
      rawText,
      extraction,
      resumeId,
      candidateId,
      resolvedTenant
    );

    if (!chunks.length) {
      await prisma.resumeVersion.update({
        where: { id: resumeId },
        data: { pipelineStatus: "COMPLETE", embeddedAt: new Date() },
      });
      return { indexed: 0 };
    }

    const { chunkEmbeddings, aggregateVector } = await EmbeddingService.embedChunks(chunks);
    void aggregateVector;

    const docs = chunks.map((chunk, i) =>
      chunkToSearchDoc(chunk, chunkEmbeddings[i], chunks.length)
    );
    await AzureSearchIndexer.upsertDocuments(docs);

    const model =
      chunkEmbeddings[0]?.embeddingModel ?? getPipelineEnv().OLLAMA_EMBED_MODEL;
    await upsertResumeSearchEmbedding(resumeId, resolvedTenant, docs.length, model);

    await prisma.resumeVersion.update({
      where: { id: resumeId },
      data: { pipelineStatus: "EMBEDDED", embeddedAt: new Date() },
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

export async function runEmbedStageInline(
  resumeId: string,
  candidateId: string,
  tenantId?: string
): Promise<{ indexed: number }> {
  return runEmbedStage({ resumeId, candidateId, tenantId });
}

/** @deprecated Alias for runEmbedStage */
export const embedChunksJob = runEmbedStage;
