-- CreateEnum
CREATE TYPE "RecruiterDecisionType" AS ENUM ('SHORTLISTED', 'REJECTED', 'HIRED', 'PASSED_TO_INTERVIEW');

-- CreateEnum
CREATE TYPE "DecisionSignalType" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('LISTING', 'LEGACY_JOB');

-- AlterTable
ALTER TABLE "skill_aliases" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'SEED';
ALTER TABLE "skill_aliases" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "recruiter_decisions" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobSource" "JobSource" NOT NULL DEFAULT 'LEGACY_JOB',
    "tenantId" TEXT NOT NULL,
    "decision" "RecruiterDecisionType" NOT NULL,
    "decisionReason" TEXT,
    "atsScoreAtDecision" DOUBLE PRECISION,
    "scoreBreakdown" JSONB,
    "recruiterId" TEXT NOT NULL,
    "signalType" "DecisionSignalType" NOT NULL,
    "signalStrength" DOUBLE PRECISION NOT NULL,
    "roleType" TEXT NOT NULL DEFAULT 'IC',
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_variants" (
    "variantId" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "trafficPercent" INTEGER NOT NULL DEFAULT 50,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_variants_pkey" PRIMARY KEY ("variantId")
);

-- CreateTable
CREATE TABLE "prompt_assignments" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_corrections" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "originalValue" TEXT NOT NULL,
    "correctedValue" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_weight_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_weight_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embedding_drift_runs" (
    "id" TEXT NOT NULL,
    "driftScore" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "triggeredReindex" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embedding_drift_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_recalibration_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "componentDeltas" JSONB NOT NULL,
    "correlations" JSONB NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_recalibration_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recruiter_decisions_tenantId_decidedAt_idx" ON "recruiter_decisions"("tenantId", "decidedAt");

-- CreateIndex
CREATE INDEX "recruiter_decisions_jobId_idx" ON "recruiter_decisions"("jobId");

-- CreateIndex
CREATE INDEX "recruiter_decisions_resumeId_jobId_idx" ON "recruiter_decisions"("resumeId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_assignments_resumeId_key" ON "prompt_assignments"("resumeId");

-- CreateIndex
CREATE INDEX "recruiter_corrections_field_originalValue_correctedValue_idx" ON "recruiter_corrections"("field", "originalValue", "correctedValue");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_weight_profiles_tenantId_roleType_key" ON "tenant_weight_profiles"("tenantId", "roleType");

-- AddForeignKey
ALTER TABLE "prompt_assignments" ADD CONSTRAINT "prompt_assignments_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "prompt_variants"("variantId") ON DELETE CASCADE ON UPDATE CASCADE;
