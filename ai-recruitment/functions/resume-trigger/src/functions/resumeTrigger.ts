import { app, InvocationContext } from "@azure/functions";

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

async function resumeTriggerHandler(
  event: EventGridEvent,
  context: InvocationContext
): Promise<void> {
  context.log("Resume upload event:", event.subject, event.data?.resumeId);

  if (event.eventType !== "SmartHire.Resume.Uploaded") {
    context.warn("Ignoring unknown event type:", event.eventType);
    return;
  }

  const { handleResumeUploadedEvent } = await import(
    "../../../../src/lib/resume-event-handler"
  );

  await handleResumeUploadedEvent(event.data);
}

app.eventGrid("resumeTrigger", {
  handler: resumeTriggerHandler,
});
