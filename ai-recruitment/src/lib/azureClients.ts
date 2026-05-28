import { BlobServiceClient } from "@azure/storage-blob";
import { EventGridPublisherClient, AzureKeyCredential } from "@azure/eventgrid";
import { getPipelineEnv } from "@/config/pipeline-env";

let blobClient: BlobServiceClient | null = null;
let eventGridClient: EventGridPublisherClient<"EventGrid"> | null = null;

export function getBlobServiceClient(): BlobServiceClient {
  if (blobClient) return blobClient;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }
  blobClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobClient;
}

export function getSearchConfig(): {
  endpoint: string;
  key: string;
  indexName: string;
} {
  const env = getPipelineEnv();
  const endpoint = env.AZURE_SEARCH_ENDPOINT ?? process.env.AZURE_SEARCH_ENDPOINT;
  const key = env.AZURE_SEARCH_ADMIN_KEY ?? process.env.AZURE_SEARCH_ADMIN_KEY;
  if (!endpoint || !key) {
    throw new Error("Azure Search not configured");
  }
  return {
    endpoint,
    key,
    indexName: env.AZURE_SEARCH_INDEX,
  };
}

export function isAzureSearchConfigured(): boolean {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const key = process.env.AZURE_SEARCH_ADMIN_KEY;
  return Boolean(endpoint && key);
}

export function getEventGridPublisher(): EventGridPublisherClient<"EventGrid"> | null {
  if (eventGridClient) return eventGridClient;
  const endpoint = process.env.AZURE_EVENTGRID_TOPIC_ENDPOINT;
  const key = process.env.AZURE_EVENTGRID_TOPIC_KEY;
  if (!endpoint || !key) return null;
  eventGridClient = new EventGridPublisherClient(
    endpoint,
    "EventGrid",
    new AzureKeyCredential(key)
  );
  return eventGridClient;
}

export async function pingBlobStorage(): Promise<boolean> {
  try {
    const client = getBlobServiceClient();
    const container = process.env.AZURE_STORAGE_CONTAINER_RESUMES ?? "resumes";
    await client.getContainerClient(container).getProperties();
    return true;
  } catch {
    return false;
  }
}
