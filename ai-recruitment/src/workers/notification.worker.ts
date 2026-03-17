/**
 * Notification Worker
 *
 * Consumes jobs from the `notification-events` queue.
 *
 * For each event:
 *  1. Generate AI-crafted title + message (falls back to static templates)
 *  2. Persist notification to database
 *  3. Push real-time update via Redis pub/sub (SSE consumers receive it)
 *  4. Enqueue email job if the user has email notifications enabled
 *
 * Run: npx tsx src/workers/notification.worker.ts
 */

import { Worker } from 'bullmq';
import { getBullConnectionOptions } from '@/lib/redis-options';
import { QUEUE_NAMES } from '@/lib/queues';
import { type NotificationEvent } from '@/modules/notifications/events/notification.events';
import { generateNotificationContent } from '@/modules/notifications/services/aiNotification.service';
import { createNotification } from '@/modules/notifications/services/notification.service';

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('[NOTIFICATION_WORKER] REDIS_URL is required');
}

async function processNotificationEvent(event: NotificationEvent): Promise<void> {
  const { title, message } = await generateNotificationContent(
    event.type,
    event.metadata as Record<string, unknown>,
    true,
  );

  await createNotification({
    userId:    event.userId,
    eventType: event.type,
    title,
    message,
    metadata:  event.metadata as Record<string, unknown>,
    userEmail: event.userEmail,
    userName:  event.userName,
  });
}

async function bootstrap() {
  const connection = getBullConnectionOptions(redisUrl);
  if (!connection) {
    throw new Error('[NOTIFICATION_WORKER] Failed to parse REDIS_URL');
  }

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      if (job.name === 'process-notification') {
        await processNotificationEvent(job.data as NotificationEvent);
      }
    },
    {
      connection,
      concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 10),
    },
  );

  worker.on('completed', (job) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[NOTIFICATION_WORKER][DONE]', job.id, job.data?.type, job.data?.userId);
    }
  });

  worker.on('failed', (job, err) => {
    console.error('[NOTIFICATION_WORKER][FAILED]', job?.id, job?.data?.type, err.message);
  });

  worker.on('error', (err) => {
    console.error('[NOTIFICATION_WORKER][ERROR]', err);
  });

  console.log('[NOTIFICATION_WORKER] Started — listening on queue:', QUEUE_NAMES.NOTIFICATIONS);
}

void bootstrap();
