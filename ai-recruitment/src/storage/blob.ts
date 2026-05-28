import { getPipelineEnv } from "@/config/pipeline-env";
import {
  getBlobSasUrl,
  uploadResumeNested,
  sanitizeBlobFilename,
} from "@/lib/azure-storage";

export class BlobStorage {
  static async upload(
    fileBytes: Buffer,
    filename: string,
    userId: string,
    resumeId: string,
    contentType?: string
  ): Promise<{ blobPath: string; blobUrl: string }> {
    const mime =
      contentType ??
      (filename.endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : filename.endsWith(".png")
          ? "image/png"
          : "application/pdf");

    const blobPath = await uploadResumeNested(
      userId,
      resumeId,
      filename,
      fileBytes,
      mime
    );

    const env = getPipelineEnv();
    const blobUrl = await getBlobSasUrl(blobPath, env.BLOB_SAS_EXPIRY_DAYS);

    return { blobPath, blobUrl };
  }

  static sanitizeFilename(filename: string): string {
    return sanitizeBlobFilename(filename);
  }
}

export { getBlobSasUrl, uploadResumeNested, sanitizeBlobFilename };
