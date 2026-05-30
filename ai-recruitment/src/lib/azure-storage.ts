import { BlobServiceClient } from "@azure/storage-blob";
import { SASUrlGenerator } from "@/security/SASUrlGenerator";

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString)
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  return BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Upload a resume to Azure Blob Storage.
 * @returns blob path (NOT a public URL) — format: `{userId}/{resumeId}.pdf`
 */
export async function uploadResume(
  userId: string,
  resumeId: string,
  buffer: Buffer,
  contentType = "application/pdf"
): Promise<string> {
  const client = getBlobServiceClient();
  const container = client.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_RESUMES!
  );
  await container.createIfNotExists();
  const blobPath = `${userId}/${resumeId}.pdf`;
  const blockBlob = container.getBlockBlobClient(blobPath);
  await blockBlob.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobPath;
}

export function sanitizeBlobFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "resume.pdf";
}

/**
 * Upload resume with nested path: `{userId}/{resumeId}/{filename}`
 */
export async function uploadResumeNested(
  userId: string,
  resumeId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getBlobServiceClient();
  const container = client.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_RESUMES!
  );
  await container.createIfNotExists();
  const safeName = sanitizeBlobFilename(filename);
  const blobPath = `${userId}/${resumeId}/${safeName}`;
  const blockBlob = container.getBlockBlobClient(blobPath);
  await blockBlob.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobPath;
}

/**
 * Upload an avatar to Azure Blob Storage.
 * @returns blob path — format: `{userId}.{ext}`
 */
export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  ext: string,
  contentType: string
): Promise<string> {
  const client = getBlobServiceClient();
  const container = client.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_AVATARS!
  );
  await container.createIfNotExists();
  const blobPath = `${userId}.${ext}`;
  const blockBlob = container.getBlockBlobClient(blobPath);
  await blockBlob.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobPath;
}

/**
 * Generate a SAS URL for a resume blob.
 * @param expiryDays defaults to 1 hour when omitted (legacy resume reads)
 */
export async function getBlobSasUrl(
  blobPath: string,
  expiryDays?: number
): Promise<string> {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_RESUMES!;
  const expiresInSec =
    expiryDays != null ? expiryDays * 24 * 60 * 60 : 60 * 60;
  return SASUrlGenerator.generateReadSas(containerName, blobPath, expiresInSec);
}

/** @deprecated Use getBlobSasUrl(blobPath, 1) */
export async function getResumeSasUrl(blobPath: string): Promise<string> {
  return getBlobSasUrl(blobPath, undefined);
}

/**
 * Generate a 1-hour SAS URL for an avatar blob.
 */
export async function getAvatarSasUrl(blobPath: string): Promise<string> {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_AVATARS!;
  return SASUrlGenerator.generateReadSas(containerName, blobPath, 60 * 60);
}

/**
 * Delete a resume blob by path.
 */
export async function deleteResume(blobPath: string): Promise<void> {
  const client = getBlobServiceClient();
  const container = client.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_RESUMES!
  );
  await container.getBlockBlobClient(blobPath).deleteIfExists();
}

/**
 * Download resume bytes from blob storage by path.
 */
export async function downloadResumeBlob(blobPath: string): Promise<Buffer> {
  const { BlobStorageService } = await import("@/lib/BlobStorageService");
  return BlobStorageService.download(blobPath);
}

/**
 * Download resume from a blob URL (SAS or public path).
 */
export async function downloadResumeFromUrl(blobUrl: string): Promise<Buffer> {
  const res = await fetch(blobUrl, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Failed to download blob: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
