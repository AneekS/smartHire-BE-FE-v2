import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { SASUrlGenerator } from "@/security/SASUrlGenerator";
import { getPipelineEnv } from "@/config/pipeline-env";
import { getLogger } from "@/monitoring/logger";

const CONTAINER_RESUMES = () =>
  process.env.AZURE_STORAGE_CONTAINER_RESUMES ?? "resumes";
const CONTAINER_DELETED = () =>
  process.env.AZURE_STORAGE_CONTAINER_DELETED ?? "resumes-deleted";
const CONTAINER_AVATARS = () =>
  process.env.AZURE_STORAGE_CONTAINER_AVATARS ?? "avatars";

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delayMs = 250 * 2 ** i;
      getLogger().warn(
        { err, attempt: i + 1, label },
        "BlobStorageService retry"
      );
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

export class BlobStorageService {
  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "resume.pdf";
  }

  static async ensureContainer(name: string): Promise<ContainerClient> {
    const client = getBlobServiceClient();
    const container = client.getContainerClient(name);
    await withRetry(`ensureContainer:${name}`, () => container.createIfNotExists());
    return container;
  }

  /** Upload to `resumes/{tenantId}/{candidateId}/{fileId}/{filename}` */
  static async uploadResume(
    tenantId: string,
    candidateId: string,
    fileId: string,
    filename: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const safeName = BlobStorageService.sanitizeFilename(filename);
    const blobPath = `${tenantId}/${candidateId}/${fileId}/${safeName}`;
    const container = await BlobStorageService.ensureContainer(CONTAINER_RESUMES());
    const blockBlob = container.getBlockBlobClient(blobPath);

    await withRetry(`uploadResume:${blobPath}`, () =>
      blockBlob.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      })
    );

    return blobPath;
  }

  static async generateSasUrl(
    blobPath: string,
    expiryDays?: number,
    containerName = CONTAINER_RESUMES()
  ): Promise<string> {
    const env = getPipelineEnv();
    const days = expiryDays ?? env.BLOB_SAS_EXPIRY_DAYS;
    return SASUrlGenerator.generateReadSas(
      containerName,
      blobPath,
      days * 24 * 60 * 60
    );
  }

  static async download(blobPath: string, containerName = CONTAINER_RESUMES()): Promise<Buffer> {
    const container = await BlobStorageService.ensureContainer(containerName);
    const blockBlob = container.getBlockBlobClient(blobPath);
    const download = await withRetry(`download:${blobPath}`, () =>
      blockBlob.download(0)
    );
    const chunks: Buffer[] = [];
    const body = download.readableStreamBody;
    if (!body) {
      throw new Error(`Empty blob stream for ${blobPath}`);
    }
    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /** Soft-delete: copy to resumes-deleted then remove from active container. */
  static async deleteResume(blobPath: string): Promise<void> {
    const sourceContainer = await BlobStorageService.ensureContainer(CONTAINER_RESUMES());
    const deletedContainer = await BlobStorageService.ensureContainer(CONTAINER_DELETED());
    const source = sourceContainer.getBlockBlobClient(blobPath);
    const dest = deletedContainer.getBlockBlobClient(`${Date.now()}_${blobPath}`);

    await withRetry(`deleteResume:${blobPath}`, async () => {
      const copyPoller = await dest.beginCopyFromURL(source.url);
      await copyPoller.pollUntilDone();
      await source.deleteIfExists();
    });
  }

  static async uploadAvatar(
    userId: string,
    buffer: Buffer,
    ext: string,
    contentType: string
  ): Promise<string> {
    const container = await BlobStorageService.ensureContainer(CONTAINER_AVATARS());
    const blobPath = `${userId}.${ext}`;
    const blockBlob = container.getBlockBlobClient(blobPath);
    await withRetry(`uploadAvatar:${blobPath}`, () =>
      blockBlob.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      })
    );
    return blobPath;
  }
}
