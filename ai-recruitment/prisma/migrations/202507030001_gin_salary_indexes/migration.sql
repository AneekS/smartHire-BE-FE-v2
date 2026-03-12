-- Performance: GIN index on Job.requiredSkills for hasSome/hasEvery array queries
-- NOTE: CONCURRENTLY removed — Prisma runs migrations inside a transaction
CREATE INDEX IF NOT EXISTS "Job_requiredSkills_idx" ON "Job" USING GIN ("requiredSkills");

-- Performance: B-tree indexes on Job salary range for range filter queries
CREATE INDEX IF NOT EXISTS "Job_salaryMin_idx" ON "Job"("salaryMin");
CREATE INDEX IF NOT EXISTS "Job_salaryMax_idx" ON "Job"("salaryMax");
