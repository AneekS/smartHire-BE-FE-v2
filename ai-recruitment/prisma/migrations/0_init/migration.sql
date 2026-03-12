-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BehaviorEventType" AS ENUM ('JOB_VIEW', 'JOB_CLICK', 'JOB_APPLICATION', 'JOB_SAVE', 'JOB_IGNORE');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "AccountProvider" AS ENUM ('GITHUB', 'LINKEDIN', 'GOOGLE', 'HUBSPOT', 'SLACK', 'ZOOM', 'PORTFOLIO', 'WEBSITE', 'TWITTER', 'KAGGLE', 'LEETCODE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECRUITER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'RESUME_VIEWED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER', 'REJECTED', 'HIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RecruiterActivityType" AS ENUM ('RESUME_VIEWED', 'PROFILE_VIEWED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'NOTE_ADDED', 'ASSESSMENT_SENT', 'OFFER_SENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('AI_SCREENING', 'VIDEO', 'PHONE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResumeVersionStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('CRITICAL', 'IMPROVEMENT', 'OPTIMIZATION');

-- CreateEnum
CREATE TYPE "MockInterviewType" AS ENUM ('BEHAVIORAL', 'TECHNICAL', 'SYSTEM_DESIGN');

-- CreateEnum
CREATE TYPE "MockInterviewStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CANDIDATE',
    "companyId" TEXT,
    "headline" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "school" TEXT,
    "graduationYear" TEXT,
    "linkedInUrl" TEXT,
    "githubUrl" TEXT,
    "websiteUrl" TEXT,
    "jobAlerts" BOOLEAN NOT NULL DEFAULT true,
    "aiSuggestions" BOOLEAN NOT NULL DEFAULT false,
    "publicProfile" BOOLEAN NOT NULL DEFAULT true,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "technicalScore" INTEGER NOT NULL DEFAULT 0,
    "softScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "averageSalaryL" INTEGER,
    "employeeRating" DOUBLE PRECISION,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "salary" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "experienceLevel" TEXT,
    "experienceMin" INTEGER,
    "experienceMax" INTEGER,
    "workMode" "WorkMode",
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "city" TEXT,
    "country" TEXT,
    "photoUrl" TEXT,
    "avatarUrl" TEXT,
    "summary" TEXT,
    "profileCompleteness" INTEGER NOT NULL DEFAULT 0,
    "resumeUrl" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience" INTEGER,
    "aiScore" DOUBLE PRECISION,
    "aiSummary" TEXT,
    "availability" TEXT,
    "workAuthorization" TEXT,
    "openToFreelance" BOOLEAN NOT NULL DEFAULT false,
    "internshipInterest" BOOLEAN NOT NULL DEFAULT false,
    "languagesSpoken" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employmentType" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "repoUrl" TEXT,
    "demoUrl" TEXT,
    "teamRole" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPreference" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "preferredRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredIndustries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workMode" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "openToRelocation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePrivacy" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "visibleToRecruiters" BOOLEAN NOT NULL DEFAULT true,
    "anonymousMode" BOOLEAN NOT NULL DEFAULT false,
    "hideContactInfo" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilePrivacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileVersion" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProfileInsights" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "extractedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceSummary" TEXT,
    "careerLevel" TEXT,
    "roleReadinessScore" DOUBLE PRECISION,
    "skillStrengthDistribution" JSONB,
    "suggestedImprovements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastAnalyzedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProfileInsights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationMetrics" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewPerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recruiterFeedback" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assessmentCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReputationMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "aiScore" DOUBLE PRECISION,
    "aiNotes" TEXT,
    "interviewProbability" DOUBLE PRECISION DEFAULT 0,
    "applicationHealthScore" DOUBLE PRECISION DEFAULT 0,
    "readinessScore" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "updatedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterActivity" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "activityType" "RecruiterActivityType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL DEFAULT 'CANDIDATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "salary" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAnalytics" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationsSent" INTEGER NOT NULL DEFAULT 0,
    "resumeViewed" INTEGER NOT NULL DEFAULT 0,
    "shortlistedCount" INTEGER NOT NULL DEFAULT 0,
    "interviewCount" INTEGER NOT NULL DEFAULT 0,
    "offerCount" INTEGER NOT NULL DEFAULT 0,
    "hiredCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "withdrawnCount" INTEGER NOT NULL DEFAULT 0,
    "avgHealthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT,

    CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "startYear" TEXT NOT NULL,
    "endYear" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "cgpa" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "category" TEXT,
    "isSoftSkill" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "level" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT,
    "eventType" "BehaviorEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeEmbedding" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'RESUME',
    "dimensions" INTEGER NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobEmbedding" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'JOB_DESCRIPTION',
    "dimensions" INTEGER NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "provider" "AccountProvider" NOT NULL,
    "username" TEXT,
    "profileUrl" TEXT NOT NULL,
    "isOAuth" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" "InterviewType" NOT NULL,
    "aiTranscript" TEXT,
    "aiFeedback" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleTarget" TEXT,
    "fileUrl" TEXT,
    "atsScore" INTEGER,
    "status" "ResumeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeSuggestion" (
    "id" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "type" "SuggestionType" NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockInterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "type" "MockInterviewType" NOT NULL DEFAULT 'TECHNICAL',
    "status" "MockInterviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "transcript" TEXT,
    "aiFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockInterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockInterviewMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "targetLevel" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "readinessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeRaw" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeStructured" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "skills" TEXT[],
    "experience" JSONB NOT NULL,
    "education" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeStructured_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ATSScore" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "roleBasedScores" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ATSScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGap" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "missingSkills" TEXT[],
    "learningPath" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPath" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "suggestedRoles" TEXT[],
    "readinessPercent" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRecommendation" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationScore" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "factors" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReputationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExplainabilityLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "inputHash" TEXT,
    "outputJson" JSONB NOT NULL,
    "executionTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExplainabilityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_industry_idx" ON "Company"("industry");

-- CreateIndex
CREATE INDEX "Job_title_idx" ON "Job"("title");

-- CreateIndex
CREATE INDEX "Job_location_idx" ON "Job"("location");

-- CreateIndex
CREATE INDEX "Job_experienceLevel_idx" ON "Job"("experienceLevel");

-- CreateIndex
CREATE INDEX "Job_experienceMin_experienceMax_idx" ON "Job"("experienceMin", "experienceMax");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_workMode_idx" ON "Job"("workMode");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_userId_idx" ON "Candidate"("userId");

-- CreateIndex
CREATE INDEX "Candidate_profileCompleteness_idx" ON "Candidate"("profileCompleteness");

-- CreateIndex
CREATE INDEX "Experience_candidateId_idx" ON "Experience"("candidateId");

-- CreateIndex
CREATE INDEX "Project_candidateId_idx" ON "Project"("candidateId");

-- CreateIndex
CREATE INDEX "Certification_candidateId_idx" ON "Certification"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPreference_candidateId_key" ON "CareerPreference"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfilePrivacy_candidateId_key" ON "ProfilePrivacy"("candidateId");

-- CreateIndex
CREATE INDEX "ProfileVersion_candidateId_idx" ON "ProfileVersion"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "AIProfileInsights_candidateId_key" ON "AIProfileInsights"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationMetrics_candidateId_key" ON "ReputationMetrics"("candidateId");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");

-- CreateIndex
CREATE INDEX "Application_candidateId_status_idx" ON "Application"("candidateId", "status");

-- CreateIndex
CREATE INDEX "Application_candidateId_createdAt_idx" ON "Application"("candidateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_idx" ON "ApplicationStatusHistory"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationStatusHistory_applicationId_createdAt_idx" ON "ApplicationStatusHistory"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruiterActivity_applicationId_idx" ON "RecruiterActivity"("applicationId");

-- CreateIndex
CREATE INDEX "RecruiterActivity_applicationId_createdAt_idx" ON "RecruiterActivity"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruiterActivity_activityType_idx" ON "RecruiterActivity"("activityType");

-- CreateIndex
CREATE INDEX "RecruiterActivity_createdAt_idx" ON "RecruiterActivity"("createdAt");

-- CreateIndex
CREATE INDEX "Assessment_applicationId_idx" ON "Assessment"("applicationId");

-- CreateIndex
CREATE INDEX "Assessment_deadline_idx" ON "Assessment"("deadline");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "ApplicationNote_applicationId_idx" ON "ApplicationNote"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationNote_applicationId_createdAt_idx" ON "ApplicationNote"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_applicationId_key" ON "Offer"("applicationId");

-- CreateIndex
CREATE INDEX "Offer_applicationId_idx" ON "Offer"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAnalytics_candidateId_key" ON "CandidateAnalytics"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateAnalytics_candidateId_idx" ON "CandidateAnalytics"("candidateId");

-- CreateIndex
CREATE INDEX "SavedJob_userId_createdAt_idx" ON "SavedJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedJob_jobId_idx" ON "SavedJob"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_userId_jobId_key" ON "SavedJob"("userId", "jobId");

-- CreateIndex
CREATE INDEX "JobAlert_userId_createdAt_idx" ON "JobAlert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JobAlert_role_idx" ON "JobAlert"("role");

-- CreateIndex
CREATE INDEX "JobAlert_location_idx" ON "JobAlert"("location");

-- CreateIndex
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");

-- CreateIndex
CREATE INDEX "Skill_candidateId_idx" ON "Skill"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateSkill_candidateId_idx" ON "CandidateSkill"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateSkill_normalized_idx" ON "CandidateSkill"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSkill_candidateId_normalized_key" ON "CandidateSkill"("candidateId", "normalized");

-- CreateIndex
CREATE INDEX "JobSkill_jobId_idx" ON "JobSkill"("jobId");

-- CreateIndex
CREATE INDEX "JobSkill_normalized_idx" ON "JobSkill"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "JobSkill_jobId_normalized_key" ON "JobSkill"("jobId", "normalized");

-- CreateIndex
CREATE INDEX "BehaviorEvent_candidateId_createdAt_idx" ON "BehaviorEvent"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "BehaviorEvent_candidateId_eventType_idx" ON "BehaviorEvent"("candidateId", "eventType");

-- CreateIndex
CREATE INDEX "BehaviorEvent_jobId_createdAt_idx" ON "BehaviorEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "ResumeEmbedding_candidateId_createdAt_idx" ON "ResumeEmbedding"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "JobEmbedding_jobId_createdAt_idx" ON "JobEmbedding"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobEmbedding_jobId_source_key" ON "JobEmbedding"("jobId", "source");

-- CreateIndex
CREATE INDEX "ConnectedAccount_candidateId_idx" ON "ConnectedAccount"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_candidateId_provider_key" ON "ConnectedAccount"("candidateId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_applicationId_key" ON "Interview"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_candidateId_key" ON "CandidateProfile"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeRaw_profileId_key" ON "ResumeRaw"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeStructured_profileId_key" ON "ResumeStructured"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ATSScore_profileId_key" ON "ATSScore"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillGap_profileId_key" ON "SkillGap"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPath_profileId_key" ON "CareerPath"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "JobRecommendation_profileId_jobId_key" ON "JobRecommendation"("profileId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationScore_profileId_key" ON "ReputationScore"("profileId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPreference" ADD CONSTRAINT "CareerPreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePrivacy" ADD CONSTRAINT "ProfilePrivacy_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVersion" ADD CONSTRAINT "ProfileVersion_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProfileInsights" ADD CONSTRAINT "AIProfileInsights_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationMetrics" ADD CONSTRAINT "ReputationMetrics_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusHistory" ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterActivity" ADD CONSTRAINT "RecruiterActivity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAnalytics" ADD CONSTRAINT "CandidateAnalytics_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeEmbedding" ADD CONSTRAINT "ResumeEmbedding_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEmbedding" ADD CONSTRAINT "JobEmbedding_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeSuggestion" ADD CONSTRAINT "ResumeSuggestion_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockInterviewSession" ADD CONSTRAINT "MockInterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockInterviewMessage" ADD CONSTRAINT "MockInterviewMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MockInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerMilestone" ADD CONSTRAINT "CareerMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGoal" ADD CONSTRAINT "SkillGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeRaw" ADD CONSTRAINT "ResumeRaw_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeStructured" ADD CONSTRAINT "ResumeStructured_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ATSScore" ADD CONSTRAINT "ATSScore_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPath" ADD CONSTRAINT "CareerPath_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationScore" ADD CONSTRAINT "ReputationScore_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExplainabilityLog" ADD CONSTRAINT "AIExplainabilityLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
