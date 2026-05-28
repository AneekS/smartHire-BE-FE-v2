import { z } from "zod";

export const ALLOWED_RESUME_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".rtf",
  ".png",
  ".jpg",
  ".jpeg",
  ".tiff",
  ".tif",
] as const;

export const MAX_RESUME_UPLOAD_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/rtf",
  "text/rtf",
  "image/png",
  "image/jpeg",
  "image/tiff",
]);

export function validateResumeUploadFile(file: {
  name: string;
  size: number;
  type?: string;
}): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    return { ok: false, error: "File too large (max 15MB)" };
  }

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  if (!ALLOWED_RESUME_EXTENSIONS.includes(ext as (typeof ALLOWED_RESUME_EXTENSIONS)[number])) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${ALLOWED_RESUME_EXTENSIONS.join(", ")}`,
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    // Allow unknown/empty MIME when extension is valid (browser quirks)
    const genericOk = file.type === "application/octet-stream" || file.type === "";
    if (!genericOk) {
      return { ok: false, error: `Unsupported MIME type: ${file.type}` };
    }
  }

  return { ok: true };
}

export const ResumeUploadSchema = z.object({
  resumeVersionId: z.string().uuid().optional(),
});

export const ResumeParseSchema = z.object({
  resumeId: z.string().uuid(),
});

export const ResumeVersionSchema = z.object({
  title: z.string().min(1),
  roleTarget: z.string().optional(),
});
