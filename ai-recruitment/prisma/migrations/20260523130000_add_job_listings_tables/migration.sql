-- Job ATS Scorer tables (were in schema but never migrated to Azure)

CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "location" TEXT,
    "job_type" TEXT,
    "experience_level" TEXT,
    "salary_range" TEXT,
    "tech_stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "job_description" TEXT,
    "requirements" TEXT,
    "responsibilities" TEXT,
    "nice_to_have" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_ats_scores" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_ats_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_ats_scores_candidateId_listingId_key" ON "job_ats_scores"("candidateId", "listingId");

CREATE TABLE "skill_gaps" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "gaps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_gaps_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "job_ats_scores" ADD CONSTRAINT "job_ats_scores_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_ats_scores" ADD CONSTRAINT "job_ats_scores_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "job_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_gaps" ADD CONSTRAINT "skill_gaps_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "skill_gaps" ADD CONSTRAINT "skill_gaps_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "job_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
