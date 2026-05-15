CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TABLE "UserSalaryProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "minSalary" INTEGER NOT NULL,
  "maxSalary" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "salaryType" "SalaryType" NOT NULL DEFAULT 'YEARLY',
  "isNegotiable" BOOLEAN NOT NULL DEFAULT true,
  "preferredLocations" JSONB,
  "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSalaryProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobSalaryData" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "minOfferedSalary" INTEGER,
  "maxOfferedSalary" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "salaryType" "SalaryType" NOT NULL DEFAULT 'YEARLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobSalaryData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryInsights" (
  "id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "salaryType" "SalaryType" NOT NULL DEFAULT 'YEARLY',
  "avgSalary" INTEGER NOT NULL,
  "medianSalary" INTEGER NOT NULL,
  "percentile25" INTEGER NOT NULL,
  "percentile75" INTEGER NOT NULL,
  "source" TEXT DEFAULT 'INTERNAL_AGGREGATE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalaryInsights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSalaryProfile_userId_key" ON "UserSalaryProfile"("userId");
CREATE INDEX "UserSalaryProfile_userId_idx" ON "UserSalaryProfile"("userId");
CREATE INDEX "UserSalaryProfile_currency_salaryType_idx" ON "UserSalaryProfile"("currency", "salaryType");

CREATE UNIQUE INDEX "JobSalaryData_jobId_key" ON "JobSalaryData"("jobId");
CREATE INDEX "JobSalaryData_jobId_idx" ON "JobSalaryData"("jobId");
CREATE INDEX "JobSalaryData_currency_salaryType_idx" ON "JobSalaryData"("currency", "salaryType");

CREATE INDEX "SalaryInsights_role_idx" ON "SalaryInsights"("role");
CREATE INDEX "SalaryInsights_location_idx" ON "SalaryInsights"("location");
CREATE INDEX "SalaryInsights_role_location_currency_salaryType_idx" ON "SalaryInsights"("role", "location", "currency", "salaryType");
CREATE UNIQUE INDEX "SalaryInsights_role_location_currency_salaryType_key" ON "SalaryInsights"("role", "location", "currency", "salaryType");

ALTER TABLE "UserSalaryProfile"
ADD CONSTRAINT "UserSalaryProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobSalaryData"
ADD CONSTRAINT "JobSalaryData_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
