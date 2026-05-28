import { prisma } from "@/lib/db";
import { getCachedExtraction, setCachedExtraction } from "@/lib/cache-redis";
import {
  classifyFormat,
  ResumePreprocessor,
} from "@/parsing/preprocessor";
import { normalizeText } from "@/parsing/document-extractor";
import { SectionDetector } from "@/parsing/section-detector";
import { PIIMasker } from "@/parsing/pii";
import { encryptPiiMask } from "@/parsing/pii-store";
import { sanitizePromptInjection } from "@/parsing/prompt-sanitizer";
import { BlobStorage } from "@/storage/blob";
import {
  generateImprovements,
  MultiPassExtractor,
  wrapExtractionResult,
} from "@/parsing/extractor";
import { DedupCache, fileHash } from "@/parsing/dedup";
import { AtsEngineV3 } from "@/scoring/v3/ats-engine";
import type { PreprocessResult } from "@/parsing/preprocess.types";
import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";
import type { FormatType, ParsingMethod } from "@/parsing/preprocess.types";
import { markPipelineFailed, updatePipelineStatus } from "@/lib/pipeline-status";
import { RedisJobQueue } from "@/queue/redis-queue";
import { configureLogger, logExtractionEvent } from "@/monitoring/logger";
import { MetricsCollector } from "@/monitoring/metrics";

export interface ParseStageInput {
  resumeId: string;
  userId: string;
  candidateId: string;
  tenantId?: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  /** When false, skip BullMQ embed enqueue (sync pipeline runs embed inline). */
  enqueueEmbed?: boolean;
}

export interface ParseStageResult {
  resumeId: string;
  rawText: string;
  extraction: ExtractionResumeSchemaType;
  atsScore: number;
  formatType: FormatType;
  parsingMethod: ParsingMethod;
  embedJobId?: string;
}

const extractor = new MultiPassExtractor();
const preprocessor = new ResumePreprocessor();

async function runPreprocess(
  input: ParseStageInput
): Promise<PreprocessResult> {
  const sha = fileHash(input.buffer);
  const cachedRaw = await getCachedExtraction(sha);

  if (!cachedRaw) {
    const result = await preprocessor.process(
      input.buffer,
      input.fileName,
      input.userId,
      input.resumeId
    );
    await setCachedExtraction(sha, result.rawText);
    return result;
  }

  const rawText = normalizeText(cachedRaw);
  const sections = SectionDetector.detect(rawText);
  const formatType = classifyFormat(rawText, sections);
  const { maskedText, piiMask } = PIIMasker.mask(rawText);
  const { blobPath, blobUrl } = await BlobStorage.upload(
    input.buffer,
    input.fileName,
    input.userId,
    input.resumeId,
    input.mimeType
  );

  return {
    resumeId: input.resumeId,
    rawText,
    maskedText,
    sections,
    formatType,
    parsingMethod: "text_layer",
    piiMask,
    wordCount: rawText.split(/\s+/).filter(Boolean).length,
    blobUrl,
    blobPath,
    metadata: { filename: input.fileName, mimeType: input.mimeType, cached: true },
  };
}

export async function runParseStage(input: ParseStageInput): Promise<ParseStageResult> {
  configureLogger();
  const tenantId = input.tenantId ?? input.candidateId;

  logExtractionEvent({
    event: "extraction_started",
    resume_id: input.resumeId,
    tenant_id: tenantId,
    pass_number: null,
    duration_ms: null,
    confidence: null,
    field_count: null,
    error: null,
  });
  MetricsCollector.record("extraction_started");

  try {
    await updatePipelineStatus(input.resumeId, "PREPROCESSING");

    const pre = await runPreprocess(input);

    const piiEncrypted = encryptPiiMask(pre.piiMask);

    await prisma.resumeVersion.update({
      where: { id: input.resumeId },
      data: {
        filePath: pre.blobPath,
        pipelineRawText: pre.rawText,
        tenantId: input.tenantId ?? input.candidateId,
        ...(piiEncrypted ? { piiMaskEncrypted: piiEncrypted } : {}),
      },
    });

    await updatePipelineStatus(input.resumeId, "PARSING");

    let extractionResult = await DedupCache.check(input.buffer, pre.rawText);
    if (!extractionResult) {
      MetricsCollector.record("dedup_miss");
      logExtractionEvent({
        event: "dedup_miss",
        resume_id: input.resumeId,
        tenant_id: tenantId,
        pass_number: null,
        duration_ms: null,
        confidence: null,
        field_count: null,
        error: null,
      });

      const { PromptABTester } = await import("@/feedback/ab-testing");
      const promptOverride = input.resumeId
        ? await PromptABTester.getPromptForResume(input.resumeId)
        : null;

      const sanitizedText = sanitizePromptInjection(pre.maskedText);
      extractionResult = await extractor.extract(sanitizedText, input.buffer, {
        resumeId: input.resumeId,
        tenantId,
        sections: pre.sections,
        formatType: pre.formatType,
        promptOverride: promptOverride ?? undefined,
      });
      extractionResult = {
        ...extractionResult,
        schema: PIIMasker.restore(extractionResult.schema, pre.piiMask),
      };
      await DedupCache.store(input.buffer, pre.rawText, extractionResult);
    } else {
      MetricsCollector.record("dedup_hit");
      logExtractionEvent({
        event: "dedup_hit",
        resume_id: input.resumeId,
        tenant_id: tenantId,
        pass_number: null,
        duration_ms: null,
        confidence: extractionResult.parseConfidence,
        field_count: null,
        error: null,
      });
      extractionResult = {
        ...extractionResult,
        schema: PIIMasker.restore(extractionResult.schema, pre.piiMask),
      };
    }

    const parseResult = wrapExtractionResult(extractionResult);
    const { getPipelineEnv } = await import("@/config/pipeline-env");
    const improvements = getPipelineEnv().SKIP_RESUME_IMPROVEMENTS_LLM
      ? []
      : await generateImprovements(parseResult.ui).catch((e) => {
          console.warn("[parse-stage] improvements skipped:", e);
          return [];
        });
    const generalScore = await AtsEngineV3.scoreGeneral(
      parseResult.resume,
      parseResult.parseConfidence
    );

    await prisma.resumeVersion.update({
      where: { id: input.resumeId },
      data: {
        status: "ACTIVE",
        atsScore: generalScore.overallScore,
        parsedContent: JSON.stringify(parseResult.ui),
        scoreBreakdown: JSON.stringify(generalScore.scoreBreakdown),
        improvements: JSON.stringify(improvements),
        pipelineStatus: "SCORED",
      },
    });

    await prisma.parsedResume.upsert({
      where: { resumeVersionId: input.resumeId },
      create: {
        resumeVersionId: input.resumeId,
        parsedData: JSON.parse(JSON.stringify(parseResult.resume)),
        extractionSchema: JSON.parse(JSON.stringify(parseResult.schema)),
        parseConfidence: parseResult.parseConfidence,
        passesRun: parseResult.passesRun,
        pass3Changed: extractionResult.pass3Changed ?? false,
      },
      update: {
        parsedData: JSON.parse(JSON.stringify(parseResult.resume)),
        extractionSchema: JSON.parse(JSON.stringify(parseResult.schema)),
        parseConfidence: parseResult.parseConfidence,
        passesRun: parseResult.passesRun,
        pass3Changed: extractionResult.pass3Changed ?? false,
      },
    });

    await updatePipelineStatus(input.resumeId, "PARSED");

    let embedJobId: string | undefined;
    if (input.enqueueEmbed !== false) {
      embedJobId = await RedisJobQueue.enqueueEmbedding({
        resumeId: input.resumeId,
        candidateId: input.candidateId,
        tenantId: input.tenantId ?? input.candidateId,
      });
      logExtractionEvent({
        event: "embedding_queued",
        resume_id: input.resumeId,
        tenant_id: tenantId,
        pass_number: null,
        duration_ms: null,
        confidence: parseResult.parseConfidence,
        field_count: null,
        error: null,
        metadata: { job_id: embedJobId },
      });
    }

    return {
      resumeId: input.resumeId,
      rawText: pre.rawText,
      extraction: parseResult.schema,
      atsScore: generalScore.overallScore,
      formatType: pre.formatType,
      parsingMethod: pre.parsingMethod,
      embedJobId,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Parse stage failed";
    await markPipelineFailed(input.resumeId, msg);
    throw e;
  }
}

/** Event Grid / parse worker entry: parse existing resume row from blob bytes. */
export async function runParseStageFromBlob(params: {
  resumeId: string;
  userId: string;
  candidateId: string;
  tenantId?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<ParseStageResult> {
  return runParseStage({
    ...params,
    enqueueEmbed: true,
  });
}
