-- Preferred roles live on Candidate (PreferredRole). Migrate from UserPreferredRole when present.

CREATE TABLE IF NOT EXISTS "PreferredRole" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 5,
  "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "source" "PreferredRoleSource" NOT NULL DEFAULT 'MANUAL',
  "roleTaxonomyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PreferredRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PreferredRole_candidateId_role_key" ON "PreferredRole"("candidateId", "role");
CREATE INDEX IF NOT EXISTS "PreferredRole_candidateId_idx" ON "PreferredRole"("candidateId");
CREATE INDEX IF NOT EXISTS "PreferredRole_candidateId_priority_idx" ON "PreferredRole"("candidateId", "priority");
CREATE INDEX IF NOT EXISTS "PreferredRole_candidateId_confidenceScore_idx" ON "PreferredRole"("candidateId", "confidenceScore" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PreferredRole_candidateId_fkey'
  ) THEN
    ALTER TABLE "PreferredRole"
    ADD CONSTRAINT "PreferredRole_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PreferredRole_roleTaxonomyId_fkey'
  ) THEN
    ALTER TABLE "PreferredRole"
    ADD CONSTRAINT "PreferredRole_roleTaxonomyId_fkey"
    FOREIGN KEY ("roleTaxonomyId") REFERENCES "RoleTaxonomy"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'UserPreferredRole') THEN
    INSERT INTO "PreferredRole" ("id", "candidateId", "role", "priority", "confidenceScore", "source", "roleTaxonomyId", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid()::text,
      c."id",
      upr."role",
      upr."priority",
      upr."confidenceScore",
      upr."source",
      upr."roleTaxonomyId",
      upr."createdAt",
      upr."updatedAt"
    FROM "UserPreferredRole" upr
    INNER JOIN "Candidate" c ON c."userId" = upr."userId"
    ON CONFLICT ("candidateId", "role") DO NOTHING;

    ALTER TABLE "UserPreferredRole" DROP CONSTRAINT IF EXISTS "UserPreferredRole_userId_fkey";
    ALTER TABLE "UserPreferredRole" DROP CONSTRAINT IF EXISTS "UserPreferredRole_roleTaxonomyId_fkey";
    DROP TABLE "UserPreferredRole";
  END IF;
END $$;
