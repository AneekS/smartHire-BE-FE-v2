/**
 * Notification Event Trigger Examples
 *
 * Shows how to fire notification events from any service or API route.
 * Import `publishNotificationEvent` and call it fire-and-forget style.
 *
 * This file is documentation only — not executed at runtime.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { publishNotificationEvent } from '@/modules/notifications/events/notification.events';

// ─── 1. Candidate Applied ───────────────────────────────────────────────────

async function exampleCandidateApplied() {
  // Call this from the application service after a successful apply
  await publishNotificationEvent({
    type:      'CANDIDATE_APPLIED',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      jobTitle:    'Backend Developer',
      companyName: 'TechNova',
      jobId:       'job_456',
      applicationId: 'app_789',
    },
  });
}

// ─── 2. Candidate Shortlisted ───────────────────────────────────────────────

async function exampleCandidateShortlisted() {
  // Call from recruiter activity handler after SHORTLISTED action
  await publishNotificationEvent({
    type:      'CANDIDATE_SHORTLISTED',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      jobTitle:     'Backend Developer',
      companyName:  'TechNova',
      recruiterName: 'John Smith',
      jobId:        'job_456',
      applicationId:'app_789',
    },
  });
}

// ─── 3. Interview Scheduled ─────────────────────────────────────────────────

async function exampleInterviewScheduled() {
  // Call from the interview creation handler
  await publishNotificationEvent({
    type:      'INTERVIEW_SCHEDULED',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      jobTitle:    'Backend Developer',
      companyName: 'TechNova',
      scheduledAt: new Date('2026-03-20T10:00:00Z').toISOString(),
      meetingUrl:  'https://meet.example.com/interview-room',
      interviewId: 'int_abc',
    },
  });
}

// ─── 4. Offer Received ──────────────────────────────────────────────────────

async function exampleOfferReceived() {
  await publishNotificationEvent({
    type:      'OFFER_RECEIVED',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      jobTitle:     'Backend Developer',
      companyName:  'TechNova',
      offerSalary:  180000,
      offerCurrency:'USD',
      applicationId:'app_789',
    },
  });
}

// ─── 5. Job Match Found ─────────────────────────────────────────────────────

async function exampleJobMatchFound() {
  await publishNotificationEvent({
    type:      'JOB_MATCH_FOUND',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      jobTitle:    'Senior TypeScript Engineer',
      companyName: 'DataStream Inc.',
      jobId:       'job_999',
    },
  });
}

// ─── 6. Profile Viewed ──────────────────────────────────────────────────────

async function exampleProfileViewed() {
  // Call from RecruiterActivity handler when PROFILE_VIEWED is recorded
  await publishNotificationEvent({
    type:      'PROFILE_VIEWED',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      recruiterName: 'Sarah Chen',
      companyName:   'InnovateCo',
    },
  });
}

// ─── 7. Skill Gap Detected ──────────────────────────────────────────────────

async function exampleSkillGapDetected() {
  await publishNotificationEvent({
    type:      'SKILL_GAP_DETECTED',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      skills: ['Kubernetes', 'Terraform', 'AWS Lambda'],
    },
  });
}

// ─── 8. New Applicant (Recruiter) ───────────────────────────────────────────

async function exampleNewApplicant() {
  // Call this when a candidate applies, notifying the recruiter/poster
  await publishNotificationEvent({
    type:      'NEW_APPLICANT',
    userId:    'user_recruiter_456',  // Recruiter's user ID
    userEmail: 'recruiter@technova.com',
    userName:  'John Smith',
    metadata: {
      candidateName: 'Alice Johnson',
      jobTitle:      'Backend Developer',
      atsScore:      87,
      applicationId: 'app_789',
    },
  });
}

// ─── 9. Assessment Due Reminder ─────────────────────────────────────────────

async function exampleAssessmentDue() {
  await publishNotificationEvent({
    type:      'ASSESSMENT_DUE',
    userId:    'user_candidate_123',
    userEmail: 'alice@example.com',
    userName:  'Alice',
    metadata: {
      jobTitle:    'Backend Developer',
      companyName: 'TechNova',
      applicationId:'app_789',
    },
  });
}

// ─── 10. System Notification ────────────────────────────────────────────────

async function exampleSystemNotification() {
  await publishNotificationEvent({
    type:   'SYSTEM',
    userId: 'user_candidate_123',
    metadata: {
      message: 'SmartHire has been updated with new AI features. Check them out!',
    },
  });
}

// ─── Integration with existing application service ────────────────────────

/**
 * Example: Integrate into `changeApplicationStatus()` in application.service.ts
 *
 * After updating the status in the DB, fire the appropriate notification:
 *
 * ```typescript
 * // In application.service.ts changeApplicationStatus():
 * if (newStatus === 'SHORTLISTED') {
 *   await publishNotificationEvent({
 *     type: 'CANDIDATE_SHORTLISTED',
 *     userId: candidate.userId!,
 *     userEmail: candidate.email,
 *     metadata: {
 *       jobTitle: job.title,
 *       companyName: company.name,
 *       jobId: job.id,
 *       applicationId: application.id,
 *     },
 *   });
 * }
 *
 * if (newStatus === 'INTERVIEW_SCHEDULED') {
 *   await publishNotificationEvent({
 *     type: 'INTERVIEW_SCHEDULED',
 *     userId: candidate.userId!,
 *     userEmail: candidate.email,
 *     metadata: { jobTitle, companyName, scheduledAt, meetingUrl },
 *   });
 * }
 *
 * if (newStatus === 'OFFER') {
 *   await publishNotificationEvent({
 *     type: 'OFFER_RECEIVED',
 *     userId: candidate.userId!,
 *     userEmail: candidate.email,
 *     metadata: { jobTitle, companyName, offerSalary, offerCurrency },
 *   });
 * }
 * ```
 */
export {};
