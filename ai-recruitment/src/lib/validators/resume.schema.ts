import { z } from "zod";

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
