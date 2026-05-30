import { handleResumeUploadedEvent } from "@/lib/resume-event-handler";
import { RedisJobQueue } from "@/queue/redis-queue";

interface EventGridEvent {
  id: string;
  subject: string;
  eventType: string;
  data: {
    resumeId: string;
    tenantId: string;
    blobUrl: string;
    userId?: string;
    candidateId?: string;
    fileName?: string;
    mimeType?: string;
    blobPath?: string;
    jobId?: string;
  };
  dataVersion: string;
}

export async function resumeTriggerHandler(event: EventGridEvent): Promise<void> {
  if (event.eventType !== "SmartHire.Resume.Uploaded") {
    console.warn("[resume-trigger] Ignoring unknown event type:", event.eventType);
    return;
  }

  const data = event.data;
  const asyncPipeline = process.env.ASYNC_RESUME_PIPELINE === "true";

  if (asyncPipeline && data.blobPath && data.userId && data.candidateId) {
    await RedisJobQueue.enqueueParseJob({
      resumeId: data.resumeId,
      userId: data.userId,
      candidateId: data.candidateId,
      tenantId: data.tenantId,
      fileName: data.fileName ?? "resume.pdf",
      mimeType: data.mimeType ?? "application/pdf",
      blobPath: data.blobPath,
    });
    console.log("[resume-trigger] Enqueued parse job for", data.resumeId);
    return;
  }

  await handleResumeUploadedEvent(data);
}
