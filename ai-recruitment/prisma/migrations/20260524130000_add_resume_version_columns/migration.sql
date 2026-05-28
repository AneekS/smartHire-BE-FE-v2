-- Add resume optimizer columns missing from initial schema
ALTER TABLE "ResumeVersion" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
ALTER TABLE "ResumeVersion" ADD COLUMN IF NOT EXISTS "parsedContent" TEXT;
ALTER TABLE "ResumeVersion" ADD COLUMN IF NOT EXISTS "scoreBreakdown" TEXT;
ALTER TABLE "ResumeVersion" ADD COLUMN IF NOT EXISTS "improvements" TEXT;

-- Parsed resume JSON store (Prisma @@map parsed_resumes)
CREATE TABLE IF NOT EXISTS "parsed_resumes" (
    "id" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "parsedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parsed_resumes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "parsed_resumes_resumeVersionId_key" ON "parsed_resumes"("resumeVersionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parsed_resumes_resumeVersionId_fkey'
  ) THEN
    ALTER TABLE "parsed_resumes"
      ADD CONSTRAINT "parsed_resumes_resumeVersionId_fkey"
      FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
