-- Phase 1: Target domain model (parallel schema — additive only)

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CANDIDATE', 'RECRUITER', 'HIRING_MANAGER', 'ADMIN');
CREATE TYPE "IndustryProfile" AS ENUM ('TECH', 'FINANCE', 'HEALTHCARE', 'SALES', 'CREATIVE', 'LEGAL', 'GENERAL');
CREATE TYPE "SeniorityBand" AS ENUM ('L1_INTERN', 'L2_JUNIOR', 'L3_MID', 'L4_SENIOR', 'L5_STAFF', 'L6_PRINCIPAL');
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REQUIRES_REVIEW');
CREATE TYPE "JobStatusV2" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ApplicationStatusV2" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "RecruiterOutcome" AS ENUM ('HIRED', 'REJECTED', 'INTERVIEW_STAGE1', 'INTERVIEW_STAGE2', 'OFFER_EXTENDED', 'OFFER_DECLINED', 'WITHDRAWN');

-- CreateTable Tenant
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_tenantId_createdAt_idx" ON "User"("tenantId", "createdAt");

-- AlterTable Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "industryProfile" "IndustryProfile";

CREATE INDEX IF NOT EXISTS "Company_tenantId_createdAt_idx" ON "Company"("tenantId", "createdAt");

-- AlterTable Recruiter
ALTER TABLE "Recruiter" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Recruiter" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Recruiter_tenantId_createdAt_idx" ON "Recruiter"("tenantId", "createdAt");

-- AlterTable Job
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "industryProfile" "IndustryProfile";
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "seniorityBand" "SeniorityBand";
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "isRemote" BOOLEAN;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "statusV2" "JobStatusV2";

CREATE INDEX IF NOT EXISTS "Job_tenantId_createdAt_idx" ON "Job"("tenantId", "createdAt");

-- AlterTable Candidate
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "preferredTitle" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "salaryExpectation" INTEGER;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "portfolioUrl" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "reputationScoreTarget" DOUBLE PRECISION;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Candidate_tenantId_createdAt_idx" ON "Candidate"("tenantId", "createdAt");

-- AlterTable Application
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "resumeVersionId" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "resumeVersionV2Id" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Application_tenantId_createdAt_idx" ON "Application"("tenantId", "createdAt");

-- AlterTable Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- AlterTable parsed_resumes
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "skills" JSONB;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "experience" JSONB;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "education" JSONB;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "projects" JSONB;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "certifications" JSONB;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "languages" JSONB;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "piiMaskEncrypted" TEXT;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "industryDomain" "IndustryProfile";
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "seniorityBand" "SeniorityBand";
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "totalYearsExp" DOUBLE PRECISION;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "pass2Triggered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "pass3Corrected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "parsed_resumes" ADD COLUMN IF NOT EXISTS "extractionEventId" TEXT;

CREATE INDEX IF NOT EXISTS "parsed_resumes_tenantId_createdAt_idx" ON "parsed_resumes"("tenantId", "createdAt");

-- AlterTable extraction_events
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "resumeVersionV2Id" TEXT;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "pass1DurationMs" INTEGER;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "pass2DurationMs" INTEGER;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "pass3DurationMs" INTEGER;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "pass2Triggered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "pass3Triggered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "finalConfidence" DOUBLE PRECISION;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "zodRejected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "ollamaLatencyP95" DOUBLE PRECISION;
ALTER TABLE "extraction_events" ADD COLUMN IF NOT EXISTS "promptVariantId" TEXT;

CREATE INDEX IF NOT EXISTS "extraction_events_tenantId_createdAt_idx" ON "extraction_events"("tenantId", "createdAt");

-- AlterTable daily_metrics
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "metricName" TEXT;
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "metricValue" DOUBLE PRECISION;
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "dimension1" TEXT;
ALTER TABLE "daily_metrics" ADD COLUMN IF NOT EXISTS "dimension2" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "daily_metrics_tenantId_date_metricName_dimension1_key"
  ON "daily_metrics"("tenantId", "date", "metricName", "dimension1");
CREATE INDEX IF NOT EXISTS "daily_metrics_tenantId_date_idx" ON "daily_metrics"("tenantId", "date");

-- AlterTable embedding_drift_runs
ALTER TABLE "embedding_drift_runs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "embedding_drift_runs" ADD COLUMN IF NOT EXISTS "threshold" DOUBLE PRECISION;
ALTER TABLE "embedding_drift_runs" ADD COLUMN IF NOT EXISTS "triggered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "embedding_drift_runs" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT;

CREATE INDEX IF NOT EXISTS "embedding_drift_runs_tenantId_ranAt_idx" ON "embedding_drift_runs"("tenantId", "ranAt");

-- CreateTable resumes
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resumes_currentVersionId_key" ON "resumes"("currentVersionId");
CREATE INDEX "resumes_tenantId_createdAt_idx" ON "resumes"("tenantId", "createdAt");
CREATE INDEX "resumes_tenantId_candidateId_idx" ON "resumes"("tenantId", "candidateId");

-- CreateTable resume_versions_v2
CREATE TABLE "resume_versions_v2" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "blobUrl" TEXT,
    "blobPath" TEXT,
    "fileHash" TEXT,
    "textHash" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "parsedResumeId" TEXT,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING',
    "parseConfidence" DOUBLE PRECISION,
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "legacyResumeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_versions_v2_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resume_versions_v2_parsedResumeId_key" ON "resume_versions_v2"("parsedResumeId");
CREATE UNIQUE INDEX "resume_versions_v2_legacyResumeVersionId_key" ON "resume_versions_v2"("legacyResumeVersionId");
CREATE INDEX "resume_versions_v2_tenantId_createdAt_idx" ON "resume_versions_v2"("tenantId", "createdAt");
CREATE INDEX "resume_versions_v2_resumeId_idx" ON "resume_versions_v2"("resumeId");

-- CreateTable resume_search_embeddings
CREATE TABLE "resume_search_embeddings" (
    "id" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "searchIndexId" TEXT,
    "embeddingModel" TEXT NOT NULL DEFAULT 'qwen3-embedding:8b',
    "vectorDimensions" INTEGER NOT NULL DEFAULT 4096,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_search_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resume_search_embeddings_resumeVersionId_key" ON "resume_search_embeddings"("resumeVersionId");
CREATE INDEX "resume_search_embeddings_tenantId_createdAt_idx" ON "resume_search_embeddings"("tenantId", "createdAt");

-- CreateTable application_ats_scores
CREATE TABLE "application_ats_scores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "listingId" TEXT,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "semanticScore" DOUBLE PRECISION NOT NULL,
    "skillScore" DOUBLE PRECISION NOT NULL,
    "experienceScore" DOUBLE PRECISION NOT NULL,
    "complianceScore" DOUBLE PRECISION NOT NULL,
    "projectScore" DOUBLE PRECISION NOT NULL,
    "educationScore" DOUBLE PRECISION NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
    "scoreHash" TEXT,
    "industryProfile" "IndustryProfile" NOT NULL DEFAULT 'GENERAL',
    "seniorityBand" "SeniorityBand",
    "scoreVersion" TEXT NOT NULL DEFAULT 'v3',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_ats_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_ats_scores_applicationId_key" ON "application_ats_scores"("applicationId");
CREATE INDEX "application_ats_scores_tenantId_computedAt_idx" ON "application_ats_scores"("tenantId", "computedAt");
CREATE INDEX "application_ats_scores_jobId_idx" ON "application_ats_scores"("jobId");
CREATE INDEX "application_ats_scores_resumeVersionId_idx" ON "application_ats_scores"("resumeVersionId");

-- CreateTable ats_skill_gaps
CREATE TABLE "ats_skill_gaps" (
    "id" TEXT NOT NULL,
    "jobAtsScoreId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "missingSkill" TEXT NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "canonicalSkill" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ats_skill_gaps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ats_skill_gaps_jobAtsScoreId_idx" ON "ats_skill_gaps"("jobAtsScoreId");
CREATE INDEX "ats_skill_gaps_tenantId_createdAt_idx" ON "ats_skill_gaps"("tenantId", "createdAt");

-- CreateTable career_readiness
CREATE TABLE "career_readiness" (
    "id" TEXT NOT NULL,
    "jobAtsScoreId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "overallReadiness" DOUBLE PRECISION NOT NULL,
    "strengthAreas" JSONB NOT NULL DEFAULT '[]',
    "developmentAreas" JSONB NOT NULL DEFAULT '[]',
    "timeToReady" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_readiness_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "career_readiness_jobAtsScoreId_key" ON "career_readiness"("jobAtsScoreId");
CREATE INDEX "career_readiness_tenantId_createdAt_idx" ON "career_readiness"("tenantId", "createdAt");

-- CreateTable mock_interview_sessions_v2
CREATE TABLE "mock_interview_sessions_v2" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "sessionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "transcript" JSONB,
    "feedbackReport" JSONB,
    "durationSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_interview_sessions_v2_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mock_interview_sessions_v2_tenantId_createdAt_idx" ON "mock_interview_sessions_v2"("tenantId", "createdAt");
CREATE INDEX "mock_interview_sessions_v2_candidateId_idx" ON "mock_interview_sessions_v2"("candidateId");

-- CreateTable recruiter_outcome_signals
CREATE TABLE "recruiter_outcome_signals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "applicationAtsScoreId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "outcome" "RecruiterOutcome" NOT NULL,
    "outcomeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atsFinalScoreAtOutcome" DOUBLE PRECISION,
    "noteText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_outcome_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recruiter_outcome_signals_tenantId_outcomeDate_idx" ON "recruiter_outcome_signals"("tenantId", "outcomeDate");
CREATE INDEX "recruiter_outcome_signals_applicationAtsScoreId_idx" ON "recruiter_outcome_signals"("applicationAtsScoreId");

-- CreateTable weight_calibrations
CREATE TABLE "weight_calibrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "industryProfile" "IndustryProfile" NOT NULL,
    "semanticWeight" DOUBLE PRECISION NOT NULL,
    "skillWeight" DOUBLE PRECISION NOT NULL,
    "experienceWeight" DOUBLE PRECISION NOT NULL,
    "complianceWeight" DOUBLE PRECISION NOT NULL,
    "projectWeight" DOUBLE PRECISION NOT NULL,
    "educationWeight" DOUBLE PRECISION NOT NULL,
    "qualityWeight" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "discriminationPower" DOUBLE PRECISION,
    "calibrationVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "calibratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_calibrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "weight_calibrations_tenantId_industryProfile_idx" ON "weight_calibrations"("tenantId", "industryProfile");
CREATE INDEX "weight_calibrations_tenantId_createdAt_idx" ON "weight_calibrations"("tenantId", "createdAt");

-- CreateTable extraction_prompt_variants
CREATE TABLE "extraction_prompt_variants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "variantName" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_prompt_variants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "extraction_prompt_variants_tenantId_phase_idx" ON "extraction_prompt_variants"("tenantId", "phase");
CREATE INDEX "extraction_prompt_variants_tenantId_createdAt_idx" ON "extraction_prompt_variants"("tenantId", "createdAt");

-- CreateTable extraction_prompt_assignments
CREATE TABLE "extraction_prompt_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "promptVariantId" TEXT NOT NULL,
    "extractionEventId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_prompt_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "extraction_prompt_assignments_resumeVersionId_promptVariantId_key"
  ON "extraction_prompt_assignments"("resumeVersionId", "promptVariantId");
CREATE INDEX "extraction_prompt_assignments_tenantId_assignedAt_idx" ON "extraction_prompt_assignments"("tenantId", "assignedAt");

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_tenantId_occurredAt_idx" ON "audit_logs"("tenantId", "occurredAt");
CREATE INDEX "audit_logs_userId_occurredAt_idx" ON "audit_logs"("userId", "occurredAt");

-- Seed Tenant rows for legacy tenantId values (e.g. Company.id) before FK enforcement
INSERT INTO "Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt")
SELECT
  c.id,
  COALESCE(NULLIF(trim(c.name), ''), 'Company ' || substr(c.id, 1, 8)),
  'company-' || substr(replace(c.id, '-', ''), 1, 16),
  true,
  NOW(),
  NOW()
FROM "Company" c
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = c.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt")
SELECT DISTINCT
  e."tenantId",
  'Legacy tenant ' || substr(e."tenantId", 1, 8),
  'legacy-' || substr(replace(e."tenantId", '-', ''), 1, 16),
  true,
  NOW(),
  NOW()
FROM "extraction_events" e
WHERE e."tenantId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = e."tenantId")
ON CONFLICT (id) DO NOTHING;

-- AddForeignKey (Tenant)
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Recruiter" ADD CONSTRAINT "Recruiter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "parsed_resumes" ADD CONSTRAINT "parsed_resumes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "extraction_events" ADD CONSTRAINT "extraction_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "embedding_drift_runs" ADD CONSTRAINT "embedding_drift_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Application resume FKs
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeVersionV2Id_fkey" FOREIGN KEY ("resumeVersionV2Id") REFERENCES "resume_versions_v2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Resume stack FKs
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "resume_versions_v2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resume_versions_v2" ADD CONSTRAINT "resume_versions_v2_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_versions_v2" ADD CONSTRAINT "resume_versions_v2_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_versions_v2" ADD CONSTRAINT "resume_versions_v2_parsedResumeId_fkey" FOREIGN KEY ("parsedResumeId") REFERENCES "parsed_resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resume_versions_v2" ADD CONSTRAINT "resume_versions_v2_legacyResumeVersionId_fkey" FOREIGN KEY ("legacyResumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resume_search_embeddings" ADD CONSTRAINT "resume_search_embeddings_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_search_embeddings" ADD CONSTRAINT "resume_search_embeddings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ATS FKs
ALTER TABLE "application_ats_scores" ADD CONSTRAINT "application_ats_scores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_ats_scores" ADD CONSTRAINT "application_ats_scores_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_ats_scores" ADD CONSTRAINT "application_ats_scores_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_ats_scores" ADD CONSTRAINT "application_ats_scores_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ats_skill_gaps" ADD CONSTRAINT "ats_skill_gaps_jobAtsScoreId_fkey" FOREIGN KEY ("jobAtsScoreId") REFERENCES "application_ats_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ats_skill_gaps" ADD CONSTRAINT "ats_skill_gaps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_readiness" ADD CONSTRAINT "career_readiness_jobAtsScoreId_fkey" FOREIGN KEY ("jobAtsScoreId") REFERENCES "application_ats_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_readiness" ADD CONSTRAINT "career_readiness_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Interview v2 FKs
ALTER TABLE "mock_interview_sessions_v2" ADD CONSTRAINT "mock_interview_sessions_v2_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_interview_sessions_v2" ADD CONSTRAINT "mock_interview_sessions_v2_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_interview_sessions_v2" ADD CONSTRAINT "mock_interview_sessions_v2_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Feedback FKs
ALTER TABLE "recruiter_outcome_signals" ADD CONSTRAINT "recruiter_outcome_signals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruiter_outcome_signals" ADD CONSTRAINT "recruiter_outcome_signals_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruiter_outcome_signals" ADD CONSTRAINT "recruiter_outcome_signals_applicationAtsScoreId_fkey" FOREIGN KEY ("applicationAtsScoreId") REFERENCES "application_ats_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruiter_outcome_signals" ADD CONSTRAINT "recruiter_outcome_signals_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruiter_outcome_signals" ADD CONSTRAINT "recruiter_outcome_signals_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "weight_calibrations" ADD CONSTRAINT "weight_calibrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prompt A/B FKs
ALTER TABLE "extraction_prompt_variants" ADD CONSTRAINT "extraction_prompt_variants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extraction_prompt_assignments" ADD CONSTRAINT "extraction_prompt_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extraction_prompt_assignments" ADD CONSTRAINT "extraction_prompt_assignments_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extraction_prompt_assignments" ADD CONSTRAINT "extraction_prompt_assignments_promptVariantId_fkey" FOREIGN KEY ("promptVariantId") REFERENCES "extraction_prompt_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "extraction_events" ADD CONSTRAINT "extraction_events_resumeVersionV2Id_fkey" FOREIGN KEY ("resumeVersionV2Id") REFERENCES "resume_versions_v2"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "extraction_events" ADD CONSTRAINT "extraction_events_promptVariantId_fkey" FOREIGN KEY ("promptVariantId") REFERENCES "extraction_prompt_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Audit FK
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
