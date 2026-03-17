/**
 * Email Worker
 *
 * Consumes jobs from the `email-events` queue.
 *
 * For each job:
 *  1. Render the appropriate HTML email template
 *  2. Send via Resend
 *  3. Log delivery status to NotificationDeliveryLog
 *
 * Run: npx tsx src/workers/email.worker.ts
 */

import { Worker } from 'bullmq';
import { getBullConnectionOptions } from '@/lib/redis-options';
import { QUEUE_NAMES } from '@/lib/queues';
import { sendNotificationEmail } from '@/modules/notifications/services/email.service';
import { prisma } from '@/lib/db';

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('[EMAIL_WORKER] REDIS_URL is required');
}

interface EmailJobPayload {
  notificationId: string;
  userId:         string;
  userEmail:      string;
  userName:       string;
  eventType:      string;
  title:          string;
  message:        string;
  emailSubject:   string;
  metadata:       Record<string, unknown>;
  ctaUrl?:        string;
  ctaText?:       string;
}

async function processEmailJob(payload: EmailJobPayload): Promise<void> {
  // Create a PENDING log entry first
  const log = await prisma.notificationDeliveryLog.create({
    data: {
      notificationId: payload.notificationId,
      channel:        'EMAIL',
      status:         'PENDING',
    },
  });

  const result = await sendNotificationEmail({
    to:          payload.userEmail,
    userName:    payload.userName,
    subject:     payload.emailSubject,
    title:       payload.title,
    message:     payload.message,
    eventType:   payload.eventType,
    metadata:    payload.metadata,
    ctaUrl:      payload.ctaUrl,
    ctaText:     payload.ctaText,
  });

  // Update the log with the delivery outcome
  await prisma.notificationDeliveryLog.update({
    where: { id: log.id },
    data: {
      status:        result.success ? 'SENT' : 'FAILED',
      sentAt:        result.success ? new Date() : undefined,
      failureReason: result.failureReason,
    },
  });

  if (!result.success) {
    throw new Error(`Email delivery failed: ${result.failureReason}`);
  }
}

async function bootstrap() {
  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) {
    throw new Error('[EMAIL_WORKER] Failed to parse REDIS_URL');
  }

  const worker = new Worker(
    QUEUE_NAMES.EMAILS,
    async (job) => {
      if (job.name === 'send-notification-email') {
        await processEmailJob(job.data as EmailJobPayload);
      }
    },
    {
      connection,
      concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY ?? 5),
    },
  );

  worker.on('completed', (job) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[EMAIL_WORKER][SENT]', job.id, job.data?.userEmail, job.data?.eventType);
    }
  });

  worker.on('failed', (job, err) => {
    console.error('[EMAIL_WORKER][FAILED]', job?.id, job?.data?.userEmail, err.message);
  });

  worker.on('error', (err) => {
    console.error('[EMAIL_WORKER][ERROR]', err);
  });

  console.log('[EMAIL_WORKER] Started — listening on queue:', QUEUE_NAMES.EMAILS);
}

void bootstrap();
