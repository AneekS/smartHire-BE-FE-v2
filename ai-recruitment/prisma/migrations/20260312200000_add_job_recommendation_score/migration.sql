-- Migration: add JobRecommendationScore table
-- Stores precomputed recommendation scores keyed by candidateId for fast API reads.

CREATE TABLE IF NOT EXISTS "JobRecommendationScore" (
  "id"                   TEXT          NOT NULL,
  "candidateId"          TEXT          NOT NULL,
  "jobId"                TEXT          NOT NULL,
  "skillMatchScore"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "experienceMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "locationMatchScore"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "behaviorScore"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "embeddingScore"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalScore"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt"            TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "JobRecommendationScore_pkey" PRIMARY KEY ("id")
);

-- Unique constraint (one score row per candidate-job pair)
CREATE UNIQUE INDEX IF NOT EXISTS "JobRecommendationScore_candidateId_jobId_key"
  ON "JobRecommendationScore"("candidateId", "jobId");

-- Index for the fast API path: look up all scores for a candidate, sorted by totalScore
CREATE INDEX IF NOT EXISTS "JobRecommendationScore_candidateId_idx"
  ON "JobRecommendationScore"("candidateId");

CREATE INDEX IF NOT EXISTS "JobRecommendationScore_candidateId_totalScore_idx"
  ON "JobRecommendationScore"("candidateId", "totalScore" DESC);

-- Foreign keys
ALTER TABLE "JobRecommendationScore"
  ADD CONSTRAINT "JobRecommendationScore_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobRecommendationScore"
  ADD CONSTRAINT "JobRecommendationScore_jobId_fkey"
    FOREIGN KEY ("jobId")       REFERENCES "Job"("id")       ON DELETE CASCADE ON UPDATE CASCADE;
