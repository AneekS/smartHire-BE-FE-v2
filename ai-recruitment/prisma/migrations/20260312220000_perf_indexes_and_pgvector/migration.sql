-- Migration: performance_indexes_and_pgvector
-- Implements the full PostgreSQL indexing strategy and pgvector support
-- for the SmartHire AI recommendation engine at 1M+ user scale.
-- Date: 2026-03-12
-- All statements are idempotent (IF NOT EXISTS / DO $$ guards).

-- ─── pgvector extension ───────────────────────────────────────────────────────
-- Enables vector similarity operators (<->, <=>, <#>) used by the
-- recommendation engine for semantic job matching.

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── GIN index on Candidate.skills[] ─────────────────────────────────────────
-- Accelerates array containment queries:
--   WHERE 'React' = ANY("skills")
--   WHERE "skills" && ARRAY['React','TypeScript']

CREATE INDEX IF NOT EXISTS "Candidate_skills_idx"
  ON "Candidate" USING GIN ("skills");

-- ─── JobRecommendationScore.jobId index ──────────────────────────────────────
-- Required for the worker that batch-invalidates scores when a job closes.

CREATE INDEX IF NOT EXISTS "JobRecommendationScore_jobId_idx"
  ON "JobRecommendationScore"("jobId");

-- ─── Partial index: active jobs only ─────────────────────────────────────────
-- Used by recommendation engine and job search — only ACTIVE jobs are relevant.
-- Dramatically reduces index size and scan cost vs. full Job table scan.

CREATE INDEX IF NOT EXISTS "Job_active_companyId_createdAt_idx"
  ON "Job"("companyId", "createdAt" DESC)
  WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS "Job_active_createdAt_idx"
  ON "Job"("createdAt" DESC)
  WHERE "status" = 'ACTIVE';

-- ─── Covering index on Application for ATS dashboard ─────────────────────────
-- Satisfies the recruiter ATS query in a single index scan (index-only scan):
--   SELECT candidateId, jobId, status, createdAt FROM Application
--   WHERE jobId = $1 ORDER BY createdAt DESC

CREATE INDEX IF NOT EXISTS "Application_jobId_status_candidateId_idx"
  ON "Application"("jobId", "status", "candidateId", "createdAt" DESC);

-- ─── BehaviorEvent: full composite covering index ─────────────────────────────
-- The recommendation worker reads behavior signals grouped by eventType.
-- This covering index avoids a heap fetch:
--   SELECT eventType, jobId, createdAt FROM BehaviorEvent
--   WHERE candidateId = $1 AND createdAt >= $2

CREATE INDEX IF NOT EXISTS "BehaviorEvent_candidateId_createdAt_eventType_idx"
  ON "BehaviorEvent"("candidateId", "createdAt" DESC, "eventType");

-- ─── ResumeEmbedding sorted lookup ───────────────────────────────────────────
-- Fetching the most recent embedding for a candidate uses ORDER BY createdAt DESC LIMIT 1.

CREATE INDEX IF NOT EXISTS "ResumeEmbedding_candidateId_createdAt_idx"
  ON "ResumeEmbedding"("candidateId", "createdAt" DESC);

-- ─── pgvector HNSW indexes for sub-millisecond ANN similarity search ─────────
-- These require the embedding columns to be cast to vector at query time.
-- The current Float[] columns are compatible via explicit cast:
--   ORDER BY embedding::vector(1536) <-> $candidate_vec::vector(1536)
--
-- Add approximate nearest-neighbour (HNSW) indexes for O(log n) vector search
-- instead of O(n) exact scan across millions of embedding rows.
--
-- m=16, ef_construction=64 are production defaults balancing recall vs. build time.
-- For higher recall at some build-time cost use m=32, ef_construction=128.

DO $$
BEGIN
  -- HNSW index on ResumeEmbedding (cosine distance — best for normalised embeddings)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'ResumeEmbedding'
      AND indexname  = 'ResumeEmbedding_embedding_hnsw_idx'
  ) THEN
    EXECUTE $idx$
      CREATE INDEX "ResumeEmbedding_embedding_hnsw_idx"
        ON "ResumeEmbedding"
        USING hnsw (("embedding"::vector) vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    $idx$;
  END IF;
EXCEPTION WHEN others THEN
  -- pgvector may not support casting float8[] → vector in index expressions on
  -- older versions. In that case add a dedicated vector column (see NOTES below).
  RAISE NOTICE 'HNSW index on ResumeEmbedding skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- HNSW index on JobEmbedding (cosine distance)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'JobEmbedding'
      AND indexname  = 'JobEmbedding_embedding_hnsw_idx'
  ) THEN
    EXECUTE $idx$
      CREATE INDEX "JobEmbedding_embedding_hnsw_idx"
        ON "JobEmbedding"
        USING hnsw (("embedding"::vector) vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    $idx$;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'HNSW index on JobEmbedding skipped: %', SQLERRM;
END $$;

-- ─── NOTES ───────────────────────────────────────────────────────────────────
--
-- HNSW index usage (from application code via prisma.$queryRaw):
--
--   -- Top-20 semantically similar jobs for a candidate resume embedding:
--   SELECT je."jobId", (je."embedding"::vector <=> $1::vector) AS distance
--   FROM "JobEmbedding" je
--   JOIN "Job" j ON j."id" = je."jobId"
--   WHERE j."status" = 'ACTIVE'
--   ORDER BY je."embedding"::vector <=> $1::vector
--   LIMIT 20;
--
-- The <=> operator = cosine distance (1 - cosine_similarity).
-- Pass candidate embedding as a JSON array string: '[0.1, 0.2, ...]'
--
-- If the float8[] → vector cast causes issues with your pgvector version,
-- add a dedicated vector column instead:
--
--   ALTER TABLE "JobEmbedding"
--     ADD COLUMN IF NOT EXISTS "vec" vector(1536)
--     GENERATED ALWAYS AS ("embedding"::vector(1536)) STORED;
--
-- Then build the HNSW index on the generated column.
