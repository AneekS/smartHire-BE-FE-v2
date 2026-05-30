import { prisma } from "@/lib/db";
import { deleteResume } from "@/lib/azure-storage";
import type { ParsedResumeUI } from "@/models/adapters/resume-ui.adapter";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { PreprocessResult } from "@/parsing/preprocess.types";
import { enqueueResumePipelineJob } from "@/services/queue-producers";
import { runParseStage } from "@/pipeline/ParseStage";
import { runEmbedStageInline } from "@/pipeline/EmbedStage";

export interface PipelineInput {
  userId: string;
  candidateId: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  tenantId?: string;
}

export interface PipelineResult {
  resumeId: string;
  fileName: string;
  uploadedAt: string;
  parsed: ParsedResumeUI;
  resumeSchema: ResumeSchemaType;
  atsScore: number;
  scoreBreakdown: Record<string, number>;
  improvements: unknown[];
  passCount: number;
  passesRun: (1 | 2 | 3)[];
  indexed: number;
  formatType: PreprocessResult["formatType"];
  parsingMethod: PreprocessResult["parsingMethod"];
}

export async function runResumePipeline(input: PipelineInput): Promise<PipelineResult> {
  await prisma.resumeVersion.updateMany({
    where: { userId: input.userId, status: "ACTIVE" },
    data: { status: "DRAFT" },
  });

  const draft = await prisma.resumeVersion.create({
    data: {
      userId: input.userId,
      title: input.fileName,
      status: "DRAFT",
      pipelineStatus: "QUEUED",
      tenantId: input.tenantId ?? input.candidateId,
    },
  });

  const parseResult = await runParseStage({
    resumeId: draft.id,
    userId: input.userId,
    candidateId: input.candidateId,
    tenantId: input.tenantId,
    fileName: input.fileName,
    buffer: input.buffer,
    mimeType: input.mimeType,
    enqueueEmbed: false,
  });

  const { getPipelineEnv } = await import("@/config/pipeline-env");
  const skipEmbed = getPipelineEnv().SKIP_INLINE_EMBED;
  const { indexed } = skipEmbed
    ? { indexed: 0 }
    : await runEmbedStageInline(draft.id, input.candidateId, input.tenantId).catch((e) => {
        console.warn("[pipeline] inline embed skipped:", e);
        return { indexed: 0 };
      });

  await prisma.resumeVersion.update({
    where: { id: draft.id },
    data: {
      pipelineStatus: "COMPLETE",
      ...(skipEmbed ? {} : { embeddedAt: new Date() }),
    },
  });

  const version = await prisma.resumeVersion.findUniqueOrThrow({
    where: { id: draft.id },
    include: { parsedResume: true },
  });

  const parsedUi = version.parsedContent
    ? (JSON.parse(version.parsedContent) as ParsedResumeUI)
    : ({} as ParsedResumeUI);
  const breakdown = version.scoreBreakdown
    ? (JSON.parse(version.scoreBreakdown) as Record<string, number>)
    : {};
  const improvements = version.improvements
    ? (JSON.parse(version.improvements) as unknown[])
    : [];

  const resumeSchema = (version.parsedResume?.parsedData ?? {}) as ResumeSchemaType;
  const passesRun = (version.parsedResume?.passesRun ?? []) as (1 | 2 | 3)[];

  return {
    resumeId: draft.id,
    fileName: input.fileName,
    uploadedAt: version.createdAt.toISOString(),
    parsed: parsedUi,
    resumeSchema,
    atsScore: parseResult.atsScore,
    scoreBreakdown: breakdown,
    improvements,
    passCount: passesRun.length,
    passesRun,
    indexed,
    formatType: parseResult.formatType,
    parsingMethod: parseResult.parsingMethod,
  };
}

export async function enqueueOrRunPipeline(
  input: PipelineInput
): Promise<{ async: boolean; jobId?: string; result?: PipelineResult }> {
  const { getPipelineEnv } = await import("@/config/pipeline-env");
  const env = getPipelineEnv();
  if (env.ASYNC_RESUME_PIPELINE) {
    const jobId = await enqueueResumePipelineJob(input);
    return { async: true, jobId };
  }
  const result = await runResumePipeline(input);
  return { async: false, result };
}

export async function deleteUserResume(userId: string): Promise<void> {
  const resume = await prisma.resumeVersion.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!resume) throw new Error("No resume found");

  if (resume.filePath) await deleteResume(resume.filePath);

  const { deleteResumeChunks, isSearchConfigured } = await import("@/embedding/search");
  if (await isSearchConfigured()) {
    await deleteResumeChunks(resume.id);
  }

  await prisma.resumeVersion.delete({ where: { id: resume.id } });
}
