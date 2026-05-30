import { BlobStorageService } from "@/lib/BlobStorageService";
import { runParseStageFromBlob } from "@/pipeline/parse-stage";
import { prisma } from "@/lib/db";
import type { ResumeUploadedEventData } from "@/lib/event-grid";
import { updatePipelineStatus } from "@/lib/pipeline-status";

export async function handleResumeUploadedEvent(
  data: ResumeUploadedEventData
): Promise<{ resumeId: string; embedJobId?: string }> {
  const {
    resumeId,
    tenantId,
    blobUrl,
    userId,
    candidateId,
    fileName,
    mimeType,
    blobPath,
  } = data;

  const version = await prisma.resumeVersion.findUnique({ where: { id: resumeId } });
  if (!version) {
    throw new Error(`ResumeVersion ${resumeId} not found`);
  }

  await updatePipelineStatus(resumeId, "PREPROCESSING");

  let buffer: Buffer;
  if (blobPath) {
    buffer = await BlobStorageService.download(blobPath);
  } else {
    const res = await fetch(blobUrl, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Failed to download blob: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  const resolvedUserId = userId ?? version.userId;
  const resolvedCandidateId = candidateId ?? tenantId;
  const resolvedFileName = fileName ?? version.title;
  const resolvedMime = mimeType ?? "application/pdf";

  const result = await runParseStageFromBlob({
    resumeId,
    userId: resolvedUserId,
    candidateId: resolvedCandidateId,
    tenantId,
    fileName: resolvedFileName,
    mimeType: resolvedMime,
    buffer,
  });

  return { resumeId: result.resumeId, embedJobId: result.embedJobId };
}
