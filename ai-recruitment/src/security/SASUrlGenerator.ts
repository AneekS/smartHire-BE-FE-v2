import {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";
import { getPipelineEnv } from "@/config/pipeline-env";

export class SASUrlGenerator {
  static generateReadSas(
    container: string,
    blobPath: string,
    expiresInSec?: number
  ): string {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
    const env = getPipelineEnv();
    const ttlSec =
      expiresInSec ?? env.BLOB_SAS_EXPIRY_DAYS * 24 * 60 * 60;
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const expiresOn = new Date(Date.now() + ttlSec * 1000);
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn,
      },
      credential
    ).toString();
    return `https://${accountName}.blob.core.windows.net/${container}/${blobPath}?${sasToken}`;
  }
}
