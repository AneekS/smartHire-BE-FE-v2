import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

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
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_RESUMES!;
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const ms =
    expiryDays != null
      ? expiryDays * 24 * 60 * 60 * 1000
      : 60 * 60 * 1000;
  const expiresOn = new Date(Date.now() + ms);
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    credential
  ).toString();
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;
}

/** @deprecated Use getBlobSasUrl(blobPath, 1) */
export async function getResumeSasUrl(blobPath: string): Promise<string> {
  return getBlobSasUrl(blobPath, undefined);
}

/**
 * Generate a 1-hour SAS URL for an avatar blob.
 */
export async function getAvatarSasUrl(blobPath: string): Promise<string> {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_AVATARS!;
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000);
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    credential
  ).toString();
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;
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
  const client = getBlobServiceClient();
  const container = client.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_RESUMES!
  );
  const blockBlob = container.getBlockBlobClient(blobPath);
  const download = await blockBlob.download(0);
  const chunks: Buffer[] = [];
  if (!download.readableStreamBody) {
    throw new Error(`Empty blob stream for ${blobPath}`);
  }
  for await (const chunk of download.readableStreamBody) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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
