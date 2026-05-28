-- AlterTable
ALTER TABLE "ResumeVersion" ADD COLUMN IF NOT EXISTS "piiMaskEncrypted" TEXT;
