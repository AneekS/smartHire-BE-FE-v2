-- Migration: audit_schema_improvements (idempotent version)
-- Adds: Recruiter model, Notification model, OfferStatus enum,
--       NotificationType enum, Company fields, Interview fields,
--       Job.recruiterId FK, and missing indexes.
-- Date: 2026-03-12

-- ─── New enums (safe: DO block catches duplicate_object) ─────────────────────

DO $$ BEGIN
  CREATE TYPE "OfferStatus" AS ENUM (
    'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'APPLICATION_STATUS_CHANGED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEW_REMINDER',
    'OFFER_RECEIVED',
    'OFFER_ACCEPTED',
    'OFFER_DECLINED',
    'JOB_RECOMMENDATION',
    'PROFILE_VIEWED',
    'ASSESSMENT_ASSIGNED',
    'ASSESSMENT_DUE',
    'MESSAGE_RECEIVED',
    'SYSTEM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Recruiter table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Recruiter" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "name"       TEXT         NOT NULL,
  "title"      TEXT,
  "department" TEXT,
  "bio"        TEXT,
  "avatarUrl"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Recruiter_userId_key" ON "Recruiter"("userId");
CREATE INDEX        IF NOT EXISTS "Recruiter_userId_idx" ON "Recruiter"("userId");

DO $$ BEGIN
  ALTER TABLE "Recruiter"
    ADD CONSTRAINT "Recruiter_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Job.recruiterId (optional FK to Recruiter) ───────────────────────────────

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "recruiterId" TEXT;

CREATE INDEX IF NOT EXISTS "Job_recruiterId_idx" ON "Job"("recruiterId");

DO $$ BEGIN
  ALTER TABLE "Job"
    ADD CONSTRAINT "Job_recruiterId_fkey"
      FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Offer.status: String → OfferStatus enum (guarded) ───────────────────────

DO $$
BEGIN
  -- Only run if the column is still stored as text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'Offer'
      AND column_name  = 'status'
      AND udt_name     = 'text'
  ) THEN
    ALTER TABLE "Offer" ADD COLUMN "status_new" "OfferStatus" NOT NULL DEFAULT 'PENDING';
    UPDATE "Offer"
      SET "status_new" = CASE
        WHEN "status" IN ('PENDING','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN')
          THEN "status"::"OfferStatus"
        ELSE 'PENDING'::"OfferStatus"
      END;
    ALTER TABLE "Offer" DROP COLUMN "status";
    ALTER TABLE "Offer" RENAME COLUMN "status_new" TO "status";
  END IF;
END $$;

-- ─── Company: add production-grade fields ─────────────────────────────────────

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "website"     TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "location"    TEXT,
  ADD COLUMN IF NOT EXISTS "foundedYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─── Interview: add scheduling/logistics fields ───────────────────────────────

ALTER TABLE "Interview"
  ADD COLUMN IF NOT EXISTS "duration"   INTEGER,
  ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "notes"      TEXT;

CREATE INDEX IF NOT EXISTS "Interview_scheduledAt_idx" ON "Interview"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Interview_status_idx"      ON "Interview"("status");

-- ─── Notification table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT               NOT NULL,
  "userId"    TEXT               NOT NULL,
  "type"      "NotificationType" NOT NULL,
  "title"     TEXT               NOT NULL,
  "message"   TEXT               NOT NULL,
  "isRead"    BOOLEAN            NOT NULL DEFAULT false,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"    ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
