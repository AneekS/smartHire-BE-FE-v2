/**
 * Push a test notification directly into the database.
 *
 * Usage:
 *   cd ai-recruitment
 *   npx tsx src/modules/notifications/scripts/push-test-notification.ts
 *
 * Optional env overrides:
 *   TEST_USER_ID=<userId>  — target a specific user (defaults to first user in DB)
 *   TEST_EVENT=<type>      — notification event type (defaults to CANDIDATE_SHORTLISTED)
 */

import 'dotenv/config';
import { config } from 'dotenv';
// Load .env.local (Next.js convention) — fallback if --env-file flag isn't supported
config({ path: '.env.local', override: false });
import { prisma } from '@/lib/db';
import { generateNotificationContent } from '@/modules/notifications/services/aiNotification.service';
import { createNotification } from '@/modules/notifications/services/notification.service';
import { type NotificationEventType } from '@/modules/notifications/events/notification.events';

async function main() {
  // ── Resolve target user ─────────────────────────────────────────────────────
  let userId  = process.env.TEST_USER_ID;
  let email   = '';
  let name    = 'Test User';

  if (userId) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      console.error(`❌ User "${userId}" not found in database.`);
      process.exit(1);
    }
    email = user.email;
    name  = user.name ?? name;
  } else {
    const user = await prisma.user.findFirst({
      select:  { id: true, email: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!user) {
      console.error('❌ No users found in database. Create a user first.');
      process.exit(1);
    }
    userId = user.id;
    email  = user.email;
    name   = user.name ?? name;
  }

  // ── Resolve event type ──────────────────────────────────────────────────────
  const eventType = (process.env.TEST_EVENT ?? 'CANDIDATE_SHORTLISTED') as NotificationEventType;

  const metadata = {
    jobTitle:    'Senior Software Engineer',
    companyName: 'TechNova',
    recruiterName: 'Sarah Chen',
    jobId:       'demo-job-001',
  };

  console.log(`\n📣 Pushing notification`);
  console.log(`   User  : ${name} <${email}> (${userId})`);
  console.log(`   Event : ${eventType}`);
  console.log(`   Meta  : ${JSON.stringify(metadata)}\n`);

  // ── Generate content ────────────────────────────────────────────────────────
  console.log('🤖 Generating notification content (AI + fallback)…');
  const { title, message, emailSubject } = await generateNotificationContent(
    eventType,
    metadata,
    true,
  );
  console.log(`   Title  : ${title}`);
  console.log(`   Message: ${message}`);
  console.log(`   Subject: ${emailSubject}\n`);

  // ── Persist notification ────────────────────────────────────────────────────
  console.log('💾 Saving notification to database…');
  await createNotification({
    userId,
    eventType,
    title,
    message,
    metadata,
    userEmail: email,
    userName:  name,
  });

  console.log('✅ Notification pushed successfully!');
  console.log('   Open /notifications in your browser to see it.\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
