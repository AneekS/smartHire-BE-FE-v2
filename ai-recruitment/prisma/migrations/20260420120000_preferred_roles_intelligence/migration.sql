-- Preferred role intelligence core tables
CREATE TYPE "PreferredRoleSource" AS ENUM ('MANUAL', 'INFERRED', 'BEHAVIORAL');

CREATE TABLE "RoleTaxonomy" (
  "id" TEXT NOT NULL,
  "roleName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "skillsRequired" JSONB,
  "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoleTaxonomy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPreferredRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 5,
  "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "source" "PreferredRoleSource" NOT NULL DEFAULT 'MANUAL',
  "roleTaxonomyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreferredRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBehaviorSignal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "viewedJobs" INTEGER NOT NULL DEFAULT 0,
  "appliedJobs" INTEGER NOT NULL DEFAULT 0,
  "clickedRoles" INTEGER NOT NULL DEFAULT 0,
  "timeSpentPerRole" INTEGER NOT NULL DEFAULT 0,
  "searchQueries" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserBehaviorSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleTaxonomy_roleName_key" ON "RoleTaxonomy"("roleName");
CREATE INDEX "RoleTaxonomy_category_idx" ON "RoleTaxonomy"("category");
CREATE INDEX "RoleTaxonomy_roleName_idx" ON "RoleTaxonomy"("roleName");
CREATE INDEX "RoleTaxonomy_synonyms_idx" ON "RoleTaxonomy" USING GIN ("synonyms");

CREATE UNIQUE INDEX "UserPreferredRole_userId_role_key" ON "UserPreferredRole"("userId", "role");
CREATE INDEX "UserPreferredRole_userId_priority_idx" ON "UserPreferredRole"("userId", "priority");
CREATE INDEX "UserPreferredRole_userId_confidenceScore_idx" ON "UserPreferredRole"("userId", "confidenceScore" DESC);

CREATE UNIQUE INDEX "UserBehaviorSignal_userId_role_key" ON "UserBehaviorSignal"("userId", "role");
CREATE INDEX "UserBehaviorSignal_userId_updatedAt_idx" ON "UserBehaviorSignal"("userId", "updatedAt");

ALTER TABLE "UserPreferredRole"
ADD CONSTRAINT "UserPreferredRole_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPreferredRole"
ADD CONSTRAINT "UserPreferredRole_roleTaxonomyId_fkey"
FOREIGN KEY ("roleTaxonomyId") REFERENCES "RoleTaxonomy"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserBehaviorSignal"
ADD CONSTRAINT "UserBehaviorSignal_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
