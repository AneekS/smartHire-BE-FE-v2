-- AlterTable
ALTER TABLE "parsed_resumes" ADD COLUMN "parseConfidence" DOUBLE PRECISION,
ADD COLUMN "passesRun" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "pass3Changed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "extraction_events" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "tenantId" TEXT,
    "event" TEXT NOT NULL,
    "passNumber" INTEGER,
    "durationMs" INTEGER,
    "confidence" DOUBLE PRECISION,
    "fieldCount" INTEGER,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "domain" TEXT,
    "dimensions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_cooldowns" (
    "metricKey" TEXT NOT NULL,
    "lastFiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_cooldowns_pkey" PRIMARY KEY ("metricKey")
);

-- CreateIndex
CREATE INDEX "extraction_events_event_createdAt_idx" ON "extraction_events"("event", "createdAt");

-- CreateIndex
CREATE INDEX "extraction_events_resumeId_idx" ON "extraction_events"("resumeId");

-- CreateIndex
CREATE INDEX "daily_metrics_metricKey_date_idx" ON "daily_metrics"("metricKey", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_date_metricKey_domain_key" ON "daily_metrics"("date", "metricKey", "domain");
