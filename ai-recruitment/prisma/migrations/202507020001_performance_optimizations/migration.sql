-- Performance optimization: Add score breakdown columns to JobRecommendation
ALTER TABLE "JobRecommendation" ADD COLUMN IF NOT EXISTS "skillMatch" DOUBLE PRECISION;
ALTER TABLE "JobRecommendation" ADD COLUMN IF NOT EXISTS "experienceMatch" DOUBLE PRECISION;
ALTER TABLE "JobRecommendation" ADD COLUMN IF NOT EXISTS "locationMatch" DOUBLE PRECISION;
ALTER TABLE "JobRecommendation" ADD COLUMN IF NOT EXISTS "semanticScore" DOUBLE PRECISION;
ALTER TABLE "JobRecommendation" ADD COLUMN IF NOT EXISTS "readinessScore" DOUBLE PRECISION;
ALTER TABLE "JobRecommendation" ADD COLUMN IF NOT EXISTS "missingSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Performance optimization: Add composite index for fast precomputed score lookups
CREATE INDEX IF NOT EXISTS "JobRecommendation_profileId_matchScore_idx" ON "JobRecommendation"("profileId", "matchScore" DESC);

-- Performance optimization: Add companyId index on Job for market intelligence queries
CREATE INDEX IF NOT EXISTS "Job_companyId_idx" ON "Job"("companyId");
