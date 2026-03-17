/**
 * Notification Service
 *
 * Handles all database-level notification operations:
 * – creating and persisting notifications
 * – reading / paginating notifications for a user
 * – marking notifications as read
 * – managing notification preferences
 * – publishing real-time events via Redis pub/sub (consumed by the SSE endpoint)
 */

import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import {
  Prisma,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationType,
} from '@prisma/client';
import { getEmailQueue } from '@/lib/queues';
import { safeId } from '@/lib/utils/safeId';

// ─── Priority mapping ────────────────────────────────────────────────────────

export const EVENT_PRIORITY_MAP: Record<string, NotificationPriority> = {
  INTERVIEW_SCHEDULED:       'HIGH',
  INTERVIEW_RESCHEDULED:     'HIGH',
  OFFER_RECEIVED:            'HIGH',
  OFFER_DEADLINE:            'HIGH',
  CANDIDATE_SHORTLISTED:     'HIGH',
  ASSESSMENT_DUE:            'HIGH',
  JOB_MATCH_FOUND:           'MEDIUM',
  SALARY_MATCH_FOUND:        'MEDIUM',
  PREFERENCE_UPDATE:         'MEDIUM',
  PROFILE_VIEWED:            'MEDIUM',
  RESUME_DOWNLOADED:         'MEDIUM',
  APPLICATION_STATUS_UPDATED:'MEDIUM',
  SKILL_GAP_DETECTED:        'MEDIUM',
  CAREER_READINESS_UPDATED:  'MEDIUM',
  NEW_APPLICANT:             'MEDIUM',
  HIGH_ATS_APPLICANT:        'MEDIUM',
  AI_RECOMMENDED_CANDIDATE:  'MEDIUM',
  CANDIDATE_FEEDBACK_PENDING:'MEDIUM',
  LEARNING_RECOMMENDATION:   'LOW',
  RESUME_IMPROVEMENT:        'LOW',
  PROFILE_INCOMPLETE:        'LOW',
  INACTIVE_REMINDER:         'LOW',
  SAVED_JOB_REMINDER:        'LOW',
  JOB_ALERT_DAILY_DIGEST:    'LOW',
  COMMUNITY_POST:            'LOW',
  SYSTEM:                    'LOW',
};

// ─── Category mapping ────────────────────────────────────────────────────────

export const EVENT_CATEGORY_MAP: Record<string, NotificationCategory> = {
  CANDIDATE_APPLIED:          'APPLICATION',
  CANDIDATE_SHORTLISTED:      'APPLICATION',
  APPLICATION_STATUS_UPDATED: 'APPLICATION',
  OFFER_RECEIVED:             'APPLICATION',
  OFFER_ACCEPTED:             'APPLICATION',
  OFFER_DECLINED:             'APPLICATION',
  OFFER_DEADLINE:             'APPLICATION',
  ASSESSMENT_ASSIGNED:        'APPLICATION',
  ASSESSMENT_DUE:             'APPLICATION',
  INTERVIEW_SCHEDULED:        'INTERVIEW',
  INTERVIEW_RESCHEDULED:      'INTERVIEW',
  INTERVIEW_RESULT:           'INTERVIEW',
  INTERVIEW_REMINDER:         'INTERVIEW',
  JOB_POSTED:                 'JOB_ALERT',
  JOB_MATCH_FOUND:            'JOB_ALERT',
  SALARY_MATCH_FOUND:         'JOB_ALERT',
  JOB_ALERT_DAILY_DIGEST:     'JOB_ALERT',
  JOB_DEADLINE_ALERT:         'JOB_ALERT',
  SKILL_GAP_DETECTED:         'CAREER',
  LEARNING_RECOMMENDATION:    'CAREER',
  CAREER_READINESS_UPDATED:   'CAREER',
  PREFERENCE_UPDATE:          'CAREER',
  RESUME_IMPROVEMENT:         'CAREER',
  INTERVIEW_READINESS:        'CAREER',
  PROFILE_VIEWED:             'RECRUITER_ACTIVITY',
  RESUME_DOWNLOADED:          'RECRUITER_ACTIVITY',
  RECRUITER_MESSAGED:         'RECRUITER_ACTIVITY',
  RECRUITER_INVITED:          'RECRUITER_ACTIVITY',
  NEW_APPLICANT:              'RECRUITER_ACTIVITY',
  HIGH_ATS_APPLICANT:         'RECRUITER_ACTIVITY',
  AI_RECOMMENDED_CANDIDATE:   'RECRUITER_ACTIVITY',
  CANDIDATE_FEEDBACK_PENDING: 'RECRUITER_ACTIVITY',
  PROFILE_INCOMPLETE:         'REMINDER',
  INACTIVE_REMINDER:          'REMINDER',
  SAVED_JOB_REMINDER:         'REMINDER',
  COMMUNITY_POST:             'COMMUNITY',
  SYSTEM:                     'SYSTEM',
};

// ─── Channel mapping (category → DB notification type) ───────────────────────

export const EVENT_TYPE_MAP: Record<string, NotificationType> = {
  CANDIDATE_APPLIED:          'CANDIDATE_APPLIED',
  CANDIDATE_SHORTLISTED:      'CANDIDATE_SHORTLISTED',
  APPLICATION_STATUS_UPDATED: 'APPLICATION_STATUS_CHANGED',
  INTERVIEW_SCHEDULED:        'INTERVIEW_SCHEDULED',
  INTERVIEW_RESCHEDULED:      'INTERVIEW_RESCHEDULED',
  INTERVIEW_RESULT:           'INTERVIEW_RESULT',
  INTERVIEW_REMINDER:         'INTERVIEW_REMINDER',
  OFFER_RECEIVED:             'OFFER_RECEIVED',
  OFFER_ACCEPTED:             'OFFER_ACCEPTED',
  OFFER_DECLINED:             'OFFER_DECLINED',
  OFFER_DEADLINE:             'OFFER_DEADLINE',
  JOB_POSTED:                 'JOB_POSTED',
  JOB_MATCH_FOUND:            'JOB_MATCH_FOUND',
  SALARY_MATCH_FOUND:         'JOB_MATCH_FOUND',
  JOB_ALERT_DAILY_DIGEST:     'JOB_ALERT_DAILY_DIGEST',
  JOB_DEADLINE_ALERT:         'JOB_DEADLINE_ALERT',
  PROFILE_VIEWED:             'PROFILE_VIEWED',
  RESUME_DOWNLOADED:          'RESUME_DOWNLOADED',
  RECRUITER_MESSAGED:         'RECRUITER_MESSAGED',
  RECRUITER_INVITED:          'RECRUITER_INVITED',
  SKILL_GAP_DETECTED:         'SKILL_GAP_DETECTED',
  LEARNING_RECOMMENDATION:    'LEARNING_RECOMMENDATION',
  CAREER_READINESS_UPDATED:   'CAREER_READINESS_UPDATED',
  PREFERENCE_UPDATE:          'CAREER_READINESS_UPDATED',
  RESUME_IMPROVEMENT:         'RESUME_IMPROVEMENT',
  INTERVIEW_READINESS:        'INTERVIEW_READINESS',
  NEW_APPLICANT:              'NEW_APPLICANT',
  HIGH_ATS_APPLICANT:         'HIGH_ATS_APPLICANT',
  AI_RECOMMENDED_CANDIDATE:   'AI_RECOMMENDED_CANDIDATE',
  CANDIDATE_FEEDBACK_PENDING: 'CANDIDATE_FEEDBACK_PENDING',
  ASSESSMENT_ASSIGNED:        'ASSESSMENT_ASSIGNED',
  ASSESSMENT_DUE:             'ASSESSMENT_DUE',
  PROFILE_INCOMPLETE:         'PROFILE_INCOMPLETE',
  INACTIVE_REMINDER:          'INACTIVE_REMINDER',
  SAVED_JOB_REMINDER:         'SAVED_JOB_REMINDER',
  COMMUNITY_POST:             'COMMUNITY_POST',
  SYSTEM:                     'SYSTEM',
};

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId: string;
  eventType: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  userEmail?: string;
  userName?: string;
}

/**
 * Persist the notification, push via Redis pub/sub, and optionally enqueue email.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const type     = (EVENT_TYPE_MAP[input.eventType]     ?? 'SYSTEM') as NotificationType;
  const category = (EVENT_CATEGORY_MAP[input.eventType] ?? 'SYSTEM') as NotificationCategory;
  const priority = (EVENT_PRIORITY_MAP[input.eventType] ?? 'LOW')    as NotificationPriority;

  // Check notification preferences
  const prefs = await getOrCreatePreferences(input.userId);

  // Determine if in-app and email should be sent
  const categoryKey = categoryToPreferenceKey(category);
  const categoryEnabled = categoryKey ? (prefs as unknown as Record<string, boolean>)[categoryKey] ?? true : true;

  if (!categoryEnabled) return;

  const deliveryChannel: NotificationChannel =
    prefs.inAppEnabled && prefs.emailEnabled && !!input.userEmail
      ? 'BOTH'
      : prefs.inAppEnabled
      ? 'IN_APP'
      : prefs.emailEnabled && !!input.userEmail
      ? 'EMAIL'
      : 'IN_APP';

  const notification = await prisma.notification.create({
    data: {
      userId:   input.userId,
      type,
      category,
      priority,
      title:   input.title,
      message: input.message,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      deliveryChannel,
    },
  });

  // Real-time push via Redis pub/sub (SSE endpoint subscribes to this)
  void publishRealTime(input.userId, {
    id:        notification.id,
    type,
    category,
    priority,
    title:     notification.title,
    message:   notification.message,
    createdAt: notification.createdAt.toISOString(),
  });

  // Enqueue email if needed
  if ((deliveryChannel === 'BOTH' || deliveryChannel === 'EMAIL') && input.userEmail && prefs.emailEnabled) {
    const emailQueue = getEmailQueue();
    if (emailQueue) {
      void emailQueue.add('send-notification-email', {
        notificationId: notification.id,
        userId:         input.userId,
        userEmail:      input.userEmail,
        userName:       input.userName ?? '',
        eventType:      input.eventType,
        title:          input.title,
        message:        input.message,
        emailSubject:   input.title,
        metadata:       input.metadata ?? {},
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1_000 },
      });
    }
  }
}

// ─── Real-time push via Redis ─────────────────────────────────────────────────

async function publishRealTime(userId: string, payload: object): Promise<void> {
  try {
    const channel = `user_${safeId(userId)}_notifications`;
    await redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.warn('[NOTIFICATION_SERVICE] Redis publish failed:', err);
  }
}

// ─── Read / list ───────────────────────────────────────────────────────────────

export interface ListNotificationsInput {
  userId: string;
  category?: NotificationCategory;
  unreadOnly?: boolean;
  cursor?: string;
  limit?: number;
}

export async function listNotifications(input: ListNotificationsInput) {
  const limit = Math.min(input.limit ?? 20, 50);

  const notifications = await prisma.notification.findMany({
    where: {
      userId:   input.userId,
      ...(input.category && { category: input.category }),
      ...(input.unreadOnly && { isRead: false }),
      ...(input.cursor && { createdAt: { lt: new Date(input.cursor) } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      id:              true,
      type:            true,
      category:        true,
      priority:        true,
      title:           true,
      message:         true,
      isRead:          true,
      deliveryChannel: true,
      metadata:        true,
      createdAt:       true,
    },
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore && items.length > 0
    ? items[items.length - 1].createdAt.toISOString()
    : undefined;

  return { notifications: items, nextCursor, hasMore };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

// ─── Mark read ────────────────────────────────────────────────────────────────

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data:  { isRead: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  });
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getOrCreatePreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  });
}

export async function updatePreferences(
  userId: string,
  data: Partial<{
    inAppEnabled:            boolean;
    emailEnabled:            boolean;
    jobAlerts:               boolean;
    interviewAlerts:         boolean;
    careerAlerts:            boolean;
    recruiterActivityAlerts: boolean;
    communityAlerts:         boolean;
    applicationAlerts:       boolean;
    reminderAlerts:          boolean;
  }>,
) {
  return prisma.notificationPreference.upsert({
    where:  { userId },
    create: { userId, ...data },
    update: data,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryToPreferenceKey(cat: NotificationCategory): string | null {
  const map: Record<NotificationCategory, string | null> = {
    APPLICATION:        'applicationAlerts',
    INTERVIEW:          'interviewAlerts',
    JOB_ALERT:         'jobAlerts',
    CAREER:            'careerAlerts',
    RECRUITER_ACTIVITY:'recruiterActivityAlerts',
    COMMUNITY:         'communityAlerts',
    REMINDER:          'reminderAlerts',
    SYSTEM:            null,
  };
  return map[cat] ?? null;
}
