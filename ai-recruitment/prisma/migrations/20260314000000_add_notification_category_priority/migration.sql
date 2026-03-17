-- Migration: add_notification_category_priority
-- Adds category, priority, and deliveryChannel to the Notification model,
-- creates NotificationPreference and NotificationDeliveryLog tables,
-- and adds supporting enums.
--
-- All statements are idempotent (DO $$ / IF NOT EXISTS guards) because this
-- migration was pre-applied to the database via `prisma db push`.
-- It is recorded here to reconcile the migration history.
-- Date: 2026-03-14

-- ─── New enum types ───────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "NotificationPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationCategory" AS ENUM (
    'APPLICATION',
    'JOB_ALERT',
    'CAREER',
    'INTERVIEW',
    'RECRUITER_ACTIVITY',
    'COMMUNITY',
    'REMINDER',
    'SYSTEM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Extend NotificationType enum with new variants ───────────────────────────

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CANDIDATE_APPLIED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CANDIDATE_SHORTLISTED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERVIEW_RESCHEDULED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERVIEW_RESULT';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OFFER_DEADLINE';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_POSTED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_MATCH_FOUND';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_ALERT_DAILY_DIGEST';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'JOB_DEADLINE_ALERT';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESUME_DOWNLOADED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RECRUITER_MESSAGED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RECRUITER_INVITED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SKILL_GAP_DETECTED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEARNING_RECOMMENDATION';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CAREER_READINESS_UPDATED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESUME_IMPROVEMENT';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERVIEW_READINESS';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_APPLICANT';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HIGH_ATS_APPLICANT';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AI_RECOMMENDED_CANDIDATE';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CANDIDATE_FEEDBACK_PENDING';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROFILE_INCOMPLETE';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INACTIVE_REMINDER';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SAVED_JOB_REMINDER';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_POST';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── Alter Notification table ─────────────────────────────────────────────────

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "category"        "NotificationCategory" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS "priority"        "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "deliveryChannel" "NotificationChannel"  NOT NULL DEFAULT 'IN_APP';

-- New indexes on Notification
CREATE INDEX IF NOT EXISTS "Notification_userId_category_idx" ON "Notification"("userId", "category");
CREATE INDEX IF NOT EXISTS "Notification_userId_priority_idx" ON "Notification"("userId", "priority");

-- ─── NotificationPreference table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id"                     TEXT    NOT NULL,
  "userId"                 TEXT    NOT NULL,
  "inAppEnabled"           BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled"           BOOLEAN NOT NULL DEFAULT true,
  "jobAlerts"              BOOLEAN NOT NULL DEFAULT true,
  "interviewAlerts"        BOOLEAN NOT NULL DEFAULT true,
  "careerAlerts"           BOOLEAN NOT NULL DEFAULT true,
  "recruiterActivityAlerts" BOOLEAN NOT NULL DEFAULT true,
  "communityAlerts"        BOOLEAN NOT NULL DEFAULT true,
  "applicationAlerts"      BOOLEAN NOT NULL DEFAULT true,
  "reminderAlerts"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

DO $$ BEGIN
  ALTER TABLE "NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── NotificationDeliveryLog table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NotificationDeliveryLog" (
  "id"             TEXT           NOT NULL,
  "notificationId" TEXT           NOT NULL,
  "channel"        "NotificationChannel" NOT NULL,
  "status"         "DeliveryStatus"      NOT NULL DEFAULT 'PENDING',
  "sentAt"         TIMESTAMP(3),
  "failureReason"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_notificationId_idx" ON "NotificationDeliveryLog"("notificationId");
CREATE INDEX IF NOT EXISTS "NotificationDeliveryLog_status_idx"         ON "NotificationDeliveryLog"("status");

DO $$ BEGIN
  ALTER TABLE "NotificationDeliveryLog"
    ADD CONSTRAINT "NotificationDeliveryLog_notificationId_fkey"
      FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── ResumeVersion additional columns (applied via db push) ──────────────────

ALTER TABLE "ResumeVersion"
  ADD COLUMN IF NOT EXISTS "parsedContent"  TEXT,
  ADD COLUMN IF NOT EXISTS "scoreBreakdown" TEXT,
  ADD COLUMN IF NOT EXISTS "improvements"   TEXT;
