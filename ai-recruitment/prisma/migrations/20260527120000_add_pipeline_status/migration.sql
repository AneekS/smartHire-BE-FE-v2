-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('QUEUED', 'PREPROCESSING', 'PARSING', 'PARSED', 'EMBEDDING', 'EMBEDDED', 'SCORED', 'COMPLETE', 'FAILED');

-- AlterTable
ALTER TABLE "ResumeVersion" ADD COLUMN "pipelineStatus" "PipelineStatus" NOT NULL DEFAULT 'QUEUED';
ALTER TABLE "ResumeVersion" ADD COLUMN "pipelineError" TEXT;
ALTER TABLE "ResumeVersion" ADD COLUMN "pipelineRawText" TEXT;
ALTER TABLE "ResumeVersion" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ResumeVersion" ADD COLUMN "embeddedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "parsed_resumes" ADD COLUMN "extractionSchema" JSONB;
