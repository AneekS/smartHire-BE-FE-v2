import { app, InvocationContext } from "@azure/functions";
import { resumeTriggerHandler } from "../../../index";

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

async function handler(event: EventGridEvent, context: InvocationContext): Promise<void> {
  context.log("Resume upload event:", event.subject, event.data?.resumeId);
  await resumeTriggerHandler(event);
}

app.eventGrid("resumeTrigger", {
  handler,
});
