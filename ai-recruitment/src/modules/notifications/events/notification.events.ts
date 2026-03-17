/**
 * Notification Event System
 *
 * Centralised event types and publisher for the SmartHire notification system.
 * Every platform action that needs to notify a user must call `publishNotificationEvent`.
 *
 * Flow:
 *   Platform action → publishNotificationEvent → notification-events queue
 *   → notification.worker → DB + real-time push + email-events queue
 *   → email.worker → Resend API
 */

import { getNotificationQueue } from '@/lib/queues';
import { safeId } from '@/lib/utils/safeId';

// ─── Event type union ─────────────────────────────────────────────────────────

export type NotificationEventType =
  // Application flow
  | 'CANDIDATE_APPLIED'
  | 'CANDIDATE_SHORTLISTED'
  | 'APPLICATION_STATUS_UPDATED'
  // Interview
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_RESCHEDULED'
  | 'INTERVIEW_RESULT'
  | 'INTERVIEW_REMINDER'
  // Offers
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'OFFER_DEADLINE'
  // Jobs
  | 'JOB_POSTED'
  | 'JOB_MATCH_FOUND'
  | 'JOB_ALERT_DAILY_DIGEST'
  | 'JOB_DEADLINE_ALERT'
  // Recruiter activity
  | 'PROFILE_VIEWED'
  | 'RESUME_DOWNLOADED'
  | 'RECRUITER_MESSAGED'
  | 'RECRUITER_INVITED'
  // Career growth
  | 'SKILL_GAP_DETECTED'
  | 'LEARNING_RECOMMENDATION'
  | 'CAREER_READINESS_UPDATED'
  | 'RESUME_IMPROVEMENT'
  | 'INTERVIEW_READINESS'
  // Recruiter productivity
  | 'NEW_APPLICANT'
  | 'HIGH_ATS_APPLICANT'
  | 'AI_RECOMMENDED_CANDIDATE'
  | 'CANDIDATE_FEEDBACK_PENDING'
  // Assessments
  | 'ASSESSMENT_ASSIGNED'
  | 'ASSESSMENT_DUE'
  // Reminders / nudges
  | 'PROFILE_INCOMPLETE'
  | 'INACTIVE_REMINDER'
  | 'SAVED_JOB_REMINDER'
  // Community
  | 'COMMUNITY_POST'
  // Generic
  | 'SYSTEM';

// ─── Event payload ────────────────────────────────────────────────────────────

export interface NotificationEvent {
  /** The semantic event that occurred. */
  type: NotificationEventType;
  /** ID of the user who will receive this notification. */
  userId: string;
  /** Email of the recipient (used by email worker). */
  userEmail?: string;
  /** Display name of the recipient. */
  userName?: string;
  /** Contextual metadata consumed by the AI generator and templates. */
  metadata: {
    jobId?: string;
    jobTitle?: string;
    companyName?: string;
    applicationId?: string;
    interviewId?: string;
    scheduledAt?: string;         // ISO 8601
    meetingUrl?: string;
    offerSalary?: number;
    offerCurrency?: string;
    atsScore?: number;
    skills?: string[];
    recruiterName?: string;
    candidateName?: string;
    milestoneTitle?: string;
    [key: string]: unknown;
  };
}

// ─── Publisher ────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget: enqueue a notification event for async processing.
 *
 * @example
 * await publishNotificationEvent({
 *   type: 'CANDIDATE_SHORTLISTED',
 *   userId: candidateUserId,
 *   userEmail: candidate.email,
 *   metadata: { jobTitle: 'Backend Developer', companyName: 'TechNova', jobId },
 * });
 */
export async function publishNotificationEvent(event: NotificationEvent): Promise<void> {
  const queue = getNotificationQueue();
  if (!queue) {
    console.warn('[NOTIFICATION_EVENTS] Queue unavailable — event skipped', event.type, event.userId);
    return;
  }

  try {
    // Idempotency key prevents duplicate notifications for the same action
    const jobId = safeId(`notif-${event.type}-${event.userId}-${Date.now()}`);
    await queue.add('process-notification', event, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1_000 },
    });
  } catch (err) {
    console.error('[NOTIFICATION_EVENTS][PUBLISH_FAILED]', event.type, event.userId, err);
  }
}
