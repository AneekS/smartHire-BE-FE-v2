/**
 * One-time data migration script.
 * Copies InsForge PostgREST rows into Azure PostgreSQL via Prisma.
 * Run after pg_restore to verify parity for feature tables.
 *
 * Usage: INSFORGE_ANON_KEY=xxx npx tsx scripts/migrate-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INSFORGE_BASE_URL = "https://2674danq.ap-southeast.insforge.app";

async function fetchTable(table: string): Promise<Record<string, unknown>[]> {
  const anonKey = process.env.INSFORGE_ANON_KEY;
  if (!anonKey) throw new Error("Set INSFORGE_ANON_KEY env var");

  const res = await fetch(`${INSFORGE_BASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${table}: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function main() {
  const existingCount = await prisma.jobListing.count();
  if (existingCount > 0) {
    console.log("Already migrated — job_listings has rows. Exiting.");
    process.exit(0);
  }

  console.log("--- InsForge → Azure data migration ---\n");

  // job_listings
  const listings = await fetchTable("job_listings");
  console.log(`job_listings: ${listings.length} rows from InsForge`);
  if (listings.length > 0) {
    await prisma.jobListing.createMany({
      data: listings.map((r) => ({
        id: r.id as string,
        title: (r.job_title as string) ?? (r.title as string),
        companyName: (r.company_name as string) ?? "Company",
        location: (r.location as string) ?? null,
        jobType: (r.job_type as string) ?? null,
        experienceLevel: (r.experience_level as string) ?? null,
        salaryRange: (r.salary_range as string) ?? null,
        techStack: (r.tech_stack as string[]) ?? [],
        category: (r.category as string) ?? null,
        isFeatured: (r.is_featured as boolean) ?? false,
        description: (r.job_description as string) ?? (r.description as string) ?? null,
        requirements: (r.requirements as string) ?? null,
        responsibilities: (r.responsibilities as string) ?? null,
        niceToHave: (r.nice_to_have as string) ?? null,
        isActive: (r.is_active as boolean) ?? true,
      })),
      skipDuplicates: true,
    });
  }

  // job_ats_scores
  const atsScores = await fetchTable("job_ats_scores");
  console.log(`job_ats_scores: ${atsScores.length} rows from InsForge`);
  if (atsScores.length > 0) {
    await prisma.jobAtsScore.createMany({
      data: atsScores.map((r) => ({
        id: r.id as string,
        candidateId: r.candidate_id as string,
        listingId: r.listing_id as string,
        score: r.score as number,
        details: (r.details ?? undefined) as unknown as import("@prisma/client").Prisma.InputJsonValue | undefined,
      })),
      skipDuplicates: true,
    });
  }

  // skill_gaps
  const skillGaps = await fetchTable("skill_gaps");
  console.log(`skill_gaps: ${skillGaps.length} rows from InsForge`);
  if (skillGaps.length > 0) {
    await prisma.jobListingSkillGap.createMany({
      data: skillGaps.map((r) => ({
        id: r.id as string,
        candidateId: r.candidate_id as string,
        listingId: r.listing_id as string,
        gaps: r.gaps as unknown as import("@prisma/client").Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  // interview_sessions
  const sessions = await fetchTable("interview_sessions");
  console.log(`interview_sessions: ${sessions.length} rows from InsForge`);
  if (sessions.length > 0) {
    await prisma.interviewSession.createMany({
      data: sessions.map((r) => ({
        id: r.id as string,
        candidateId: r.candidate_id as string,
        listingId: (r.listing_id as string) ?? null,
        status: (r.status as string) ?? "active",
      })),
      skipDuplicates: true,
    });
  }

  // interview_messages
  const messages = await fetchTable("interview_messages");
  console.log(`interview_messages: ${messages.length} rows from InsForge`);
  if (messages.length > 0) {
    await prisma.interviewMessage.createMany({
      data: messages.map((r) => ({
        id: r.id as string,
        sessionId: r.session_id as string,
        role: r.role as string,
        content: r.content as string,
      })),
      skipDuplicates: true,
    });
  }

  // interview_feedback
  const feedback = await fetchTable("interview_feedback");
  console.log(`interview_feedback: ${feedback.length} rows from InsForge`);
  if (feedback.length > 0) {
    await prisma.interviewFeedback.createMany({
      data: feedback.map((r) => ({
        id: r.id as string,
        sessionId: r.session_id as string,
        summary: r.summary as string,
        score: (r.score as number) ?? null,
      })),
      skipDuplicates: true,
    });
  }

  // question_bank
  const questions = await fetchTable("question_bank");
  console.log(`question_bank: ${questions.length} rows from InsForge`);
  if (questions.length > 0) {
    await prisma.questionBank.createMany({
      data: questions.map((r) => ({
        id: r.id as string,
        question: r.question as string,
        category: (r.category as string) ?? null,
        difficulty: (r.difficulty as string) ?? null,
        tags: (r.tags as string[]) ?? [],
      })),
      skipDuplicates: true,
    });
  }

  // Verify counts
  console.log("\n--- Verification ---");
  console.log(`job_listings: ${await prisma.jobListing.count()}`);
  console.log(`job_ats_scores: ${await prisma.jobAtsScore.count()}`);
  console.log(`skill_gaps: ${await prisma.jobListingSkillGap.count()}`);
  console.log(`interview_sessions: ${await prisma.interviewSession.count()}`);
  console.log(`interview_messages: ${await prisma.interviewMessage.count()}`);
  console.log(`interview_feedback: ${await prisma.interviewFeedback.count()}`);
  console.log(`question_bank: ${await prisma.questionBank.count()}`);

  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
