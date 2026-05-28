import { EventGridPublisherClient, AzureKeyCredential } from "@azure/eventgrid";
import { getPipelineEnv } from "@/config/pipeline-env";

export interface ResumeUploadedEventData {
  resumeId: string;
  tenantId: string;
  blobUrl: string;
  userId?: string;
  candidateId?: string;
  fileName?: string;
  mimeType?: string;
  blobPath?: string;
  jobId?: string;
}

export function isEventGridConfigured(): boolean {
  const env = getPipelineEnv();
  return Boolean(env.AZURE_EVENTGRID_TOPIC_ENDPOINT && env.AZURE_EVENTGRID_TOPIC_KEY);
}

export async function publishResumeUploadedEvent(
  data: ResumeUploadedEventData
): Promise<void> {
  const env = getPipelineEnv();
  const endpoint = env.AZURE_EVENTGRID_TOPIC_ENDPOINT;
  const key = env.AZURE_EVENTGRID_TOPIC_KEY;

  if (!endpoint || !key) {
    throw new Error("Event Grid not configured — set AZURE_EVENTGRID_TOPIC_ENDPOINT and KEY");
  }

  const client = new EventGridPublisherClient(
    endpoint,
    "EventGrid",
    new AzureKeyCredential(key)
  );

  await client.send([
    {
      eventType: "SmartHire.Resume.Uploaded",
      subject: `resumes/${data.resumeId}`,
      dataVersion: "2.0",
      data,
    },
  ]);
}
