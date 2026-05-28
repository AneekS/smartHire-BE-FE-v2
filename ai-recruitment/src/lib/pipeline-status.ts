import { prisma } from "@/lib/db";
import type { PipelineStatus } from "@prisma/client";

export type { PipelineStatus };

export async function updatePipelineStatus(
  resumeId: string,
  status: PipelineStatus,
  error?: string
): Promise<void> {
  await prisma.resumeVersion.update({
    where: { id: resumeId },
    data: {
      pipelineStatus: status,
      ...(error !== undefined ? { pipelineError: error } : {}),
    },
  });
}

export async function markPipelineFailed(
  resumeId: string,
  error: string
): Promise<void> {
  await updatePipelineStatus(resumeId, "FAILED", error);
}

/** Map granular pipeline status to legacy parse/status API values. */
export function toLegacyParseStatus(
  pipelineStatus: PipelineStatus,
  hasParsedData: boolean
): "pending" | "processing" | "completed" {
  if (pipelineStatus === "COMPLETE" || pipelineStatus === "EMBEDDED") {
    return "completed";
  }
  if (
    hasParsedData ||
    ["PREPROCESSING", "PARSING", "PARSED", "EMBEDDING", "SCORED"].includes(
      pipelineStatus
    )
  ) {
    return "processing";
  }
  if (pipelineStatus === "FAILED") {
    return "pending";
  }
  return pipelineStatus === "QUEUED" ? "pending" : "processing";
}
