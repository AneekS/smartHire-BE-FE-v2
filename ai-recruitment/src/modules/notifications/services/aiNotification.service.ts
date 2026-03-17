/**
 * AI Notification Generator
 *
 * Generates human-friendly notification titles, messages, and email subjects
 * using the Insforge AI API via the official @insforge/sdk.
 * Falls back to curated static templates when AI is unavailable.
 */

import { createClient, type InsForgeClient } from '@insforge/sdk';
import { type NotificationEventType } from '../events/notification.events';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedNotification {
  title: string;
  message: string;
  emailSubject: string;
}

// ─── Static fallback templates ────────────────────────────────────────────────

const FALLBACK_TEMPLATES: Record<
  NotificationEventType,
  (meta: Record<string, unknown>) => GeneratedNotification
> = {
  CANDIDATE_APPLIED: (m) => ({
    title: 'Application Submitted!',
    message: `Your application for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} was successfully submitted.`,
    emailSubject: `Application Submitted — ${m.jobTitle ?? 'Role'} at ${m.companyName ?? 'Company'}`,
  }),
  CANDIDATE_SHORTLISTED: (m) => ({
    title: "You've Been Shortlisted!",
    message: `Great news! You've been shortlisted for ${m.jobTitle ?? 'a position'} at ${m.companyName ?? 'the company'}.`,
    emailSubject: `You've been shortlisted — ${m.jobTitle ?? 'Position'} at ${m.companyName ?? 'Company'}`,
  }),
  APPLICATION_STATUS_UPDATED: (m) => ({
    title: 'Application Status Updated',
    message: `Your application for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} has been updated.`,
    emailSubject: `Application Update — ${m.jobTitle ?? 'Role'} at ${m.companyName ?? 'Company'}`,
  }),
  INTERVIEW_SCHEDULED: (m) => ({
    title: 'Interview Scheduled!',
    message: `Your interview for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} is confirmed for ${m.scheduledAt ?? 'the scheduled time'}.`,
    emailSubject: `Interview Scheduled — ${m.companyName ?? 'Company'}`,
  }),
  INTERVIEW_RESCHEDULED: (m) => ({
    title: 'Interview Rescheduled',
    message: `Your interview for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} has been rescheduled to ${m.scheduledAt ?? 'a new time'}.`,
    emailSubject: `Interview Rescheduled — ${m.companyName ?? 'Company'}`,
  }),
  INTERVIEW_RESULT: (m) => ({
    title: 'Interview Feedback Ready',
    message: `Your interview feedback for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} is now available.`,
    emailSubject: `Interview Feedback — ${m.companyName ?? 'Company'}`,
  }),
  INTERVIEW_REMINDER: (m) => ({
    title: 'Interview Reminder',
    message: `Reminder: Your interview for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} is coming up soon.`,
    emailSubject: `Upcoming Interview Reminder — ${m.companyName ?? 'Company'}`,
  }),
  OFFER_RECEIVED: (m) => ({
    title: 'Offer Received!',
    message: `Congratulations! You received an offer for ${m.jobTitle ?? 'a position'} at ${m.companyName ?? 'the company'}.`,
    emailSubject: `Offer Received — ${m.jobTitle ?? 'Position'} at ${m.companyName ?? 'Company'}`,
  }),
  OFFER_ACCEPTED: (m) => ({
    title: 'Offer Accepted',
    message: `You accepted the offer for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'}. Welcome to the team!`,
    emailSubject: `Offer Accepted — ${m.companyName ?? 'Company'}`,
  }),
  OFFER_DECLINED: (m) => ({
    title: 'Offer Declined',
    message: `You declined the offer for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'}.`,
    emailSubject: `Offer Declined — ${m.companyName ?? 'Company'}`,
  }),
  OFFER_DEADLINE: (m) => ({
    title: 'Offer Deadline Approaching',
    message: `Your offer from ${m.companyName ?? 'the company'} is expiring soon. Please review and respond.`,
    emailSubject: `Offer Expiring Soon — ${m.companyName ?? 'Company'}`,
  }),
  JOB_POSTED: (m) => ({
    title: 'New Job Posted',
    message: `A new job "${m.jobTitle ?? 'position'}" has been posted by ${m.companyName ?? 'a company'} matching your profile.`,
    emailSubject: `New Job Alert — ${m.jobTitle ?? 'Position'} at ${m.companyName ?? 'Company'}`,
  }),
  JOB_MATCH_FOUND: (m) => ({
    title: 'High-Match Job Found!',
    message: `We found a great match for you: ${m.jobTitle ?? 'a position'} at ${m.companyName ?? 'a company'}.`,
    emailSubject: `Job Match Alert — ${m.jobTitle ?? 'Position'} at ${m.companyName ?? 'Company'}`,
  }),
  JOB_ALERT_DAILY_DIGEST: () => ({
    title: 'Your Daily Job Digest',
    message: 'New jobs matching your profile are ready. Check out today\'s curated picks.',
    emailSubject: 'Your SmartHire Daily Job Digest',
  }),
  JOB_DEADLINE_ALERT: (m) => ({
    title: 'Application Deadline Soon',
    message: `The application deadline for ${m.jobTitle ?? 'a job'} at ${m.companyName ?? 'the company'} is approaching.`,
    emailSubject: `Deadline Approaching — ${m.jobTitle ?? 'Position'}`,
  }),
  PROFILE_VIEWED: (m) => ({
    title: 'Someone Viewed Your Profile',
    message: `${m.recruiterName ? `${m.recruiterName} from ${m.companyName ?? 'a company'}` : 'A recruiter'} viewed your profile.`,
    emailSubject: 'Your profile was viewed by a recruiter',
  }),
  RESUME_DOWNLOADED: (m) => ({
    title: 'Resume Downloaded',
    message: `${m.recruiterName ? `${m.recruiterName} from ${m.companyName ?? 'a company'}` : 'A recruiter'} downloaded your resume.`,
    emailSubject: 'A recruiter downloaded your resume',
  }),
  RECRUITER_MESSAGED: (m) => ({
    title: 'New Message from Recruiter',
    message: `${m.recruiterName ?? 'A recruiter'}${m.companyName ? ` at ${m.companyName}` : ''} sent you a message.`,
    emailSubject: `Message from ${m.recruiterName ?? 'a Recruiter'}`,
  }),
  RECRUITER_INVITED: (m) => ({
    title: "You're Invited to Apply!",
    message: `${m.recruiterName ?? 'A recruiter'} from ${m.companyName ?? 'a company'} invited you to apply for ${m.jobTitle ?? 'a position'}.`,
    emailSubject: `Invitation to Apply — ${m.jobTitle ?? 'Position'} at ${m.companyName ?? 'Company'}`,
  }),
  SKILL_GAP_DETECTED: (m) => ({
    title: 'Skill Gap Identified',
    message: `We noticed a skill gap in your profile. Upskilling in ${(m.skills as string[])?.join(', ') ?? 'key areas'} could unlock more opportunities.`,
    emailSubject: 'Skill Gap Alert — Improve Your Match Rate',
  }),
  LEARNING_RECOMMENDATION: (m) => ({
    title: 'Learning Path Recommended',
    message: `We've curated a learning path to boost your career. Focus area: ${(m.skills as string[])?.join(', ') ?? 'key skills'}.`,
    emailSubject: 'Your Personalised Learning Recommendation',
  }),
  CAREER_READINESS_UPDATED: (m) => ({
    title: 'Career Readiness Score Updated',
    message: `Your career readiness for ${m.milestoneTitle ?? 'your target role'} has been updated. Check your roadmap.`,
    emailSubject: 'Career Readiness Update — SmartHire',
  }),
  RESUME_IMPROVEMENT: () => ({
    title: 'Resume Improvements Available',
    message: 'AI has found suggestions to improve your resume and boost your ATS score. Review them now.',
    emailSubject: 'Resume Improvement Suggestions — SmartHire',
  }),
  INTERVIEW_READINESS: () => ({
    title: 'Interview Readiness Alert',
    message: 'You have an upcoming interview. Take a mock interview to sharpen your skills.',
    emailSubject: 'Prepare for Your Interview — SmartHire',
  }),
  NEW_APPLICANT: (m) => ({
    title: 'New Application Received',
    message: `${m.candidateName ?? 'A candidate'} applied for ${m.jobTitle ?? 'your job posting'}.`,
    emailSubject: `New Application — ${m.jobTitle ?? 'Your Job Posting'}`,
  }),
  HIGH_ATS_APPLICANT: (m) => ({
    title: 'High ATS Score Applicant!',
    message: `${m.candidateName ?? 'A candidate'} with an ATS score of ${m.atsScore ?? 'high'}% applied for ${m.jobTitle ?? 'your job posting'}.`,
    emailSubject: `High-Match Applicant — ${m.jobTitle ?? 'Your Job'}`,
  }),
  AI_RECOMMENDED_CANDIDATE: (m) => ({
    title: 'AI Recommended Candidate',
    message: `AI has recommended ${m.candidateName ?? 'a candidate'} as a strong match for ${m.jobTitle ?? 'your job posting'}.`,
    emailSubject: `AI Recommendation — Candidate for ${m.jobTitle ?? 'Your Job'}`,
  }),
  CANDIDATE_FEEDBACK_PENDING: (m) => ({
    title: 'Candidate Awaiting Feedback',
    message: `${m.candidateName ?? 'A candidate'} is waiting for your feedback on their interview for ${m.jobTitle ?? 'the role'}.`,
    emailSubject: `Feedback Pending — ${m.candidateName ?? 'Candidate'}`,
  }),
  ASSESSMENT_ASSIGNED: (m) => ({
    title: 'Assessment Assigned',
    message: `A technical assessment for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} has been assigned to you.`,
    emailSubject: `Assessment Assigned — ${m.companyName ?? 'Company'}`,
  }),
  ASSESSMENT_DUE: (m) => ({
    title: 'Assessment Due Soon',
    message: `Your assessment for ${m.jobTitle ?? 'the role'} at ${m.companyName ?? 'the company'} is due soon. Complete it now.`,
    emailSubject: `Assessment Deadline Approaching — ${m.companyName ?? 'Company'}`,
  }),
  PROFILE_INCOMPLETE: () => ({
    title: 'Complete Your Profile',
    message: 'Your profile is incomplete. A complete profile is 40% more likely to get shortlisted.',
    emailSubject: 'Your SmartHire Profile Needs Attention',
  }),
  INACTIVE_REMINDER: () => ({
    title: "Don't Let Opportunities Pass",
    message: "You haven't been active recently. New jobs matching your profile are waiting for you.",
    emailSubject: "We Miss You — New Jobs Are Waiting",
  }),
  SAVED_JOB_REMINDER: (m) => ({
    title: 'Saved Job Closing Soon',
    message: `A job you saved — ${m.jobTitle ?? 'a position'} at ${m.companyName ?? 'a company'} — is closing soon.`,
    emailSubject: `Saved Job Expiring — ${m.jobTitle ?? 'Position'}`,
  }),
  COMMUNITY_POST: (m) => ({
    title: 'New Community Activity',
    message: `There's new activity in the community: ${m.jobTitle ?? 'Check it out'}.`,
    emailSubject: 'New Community Activity — SmartHire',
  }),
  SYSTEM: (m) => ({
    title: 'SmartHire Update',
    message: String(m.message ?? 'An update is available for you on SmartHire.'),
    emailSubject: 'SmartHire Notification',
  }),
};

// ─── Insforge AI client (lazy init) ──────────────────────────────────────────
//
// Uses the official @insforge/sdk AI module.
// client.ai.chat.completions.create() is OpenAI-compatible.
// Reuses NEXT_PUBLIC_INSFORGE_ANON_KEY — no additional secret required.

let _insforgeClient: InsForgeClient | null = null;

function getInsforgeClient(): InsForgeClient | null {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL;
  const apiKey  = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !apiKey) return null;

  if (!_insforgeClient) {
    _insforgeClient = createClient({ baseUrl, anonKey: apiKey });
  }
  return _insforgeClient;
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate a notification title, message, and email subject for the given event.
 *
 * Attempts AI generation via Insforge AI first; falls back to static templates
 * on error or when Insforge credentials are not configured.
 */
export async function generateNotificationContent(
  eventType: NotificationEventType,
  metadata: Record<string, unknown>,
  useAI = true,
): Promise<GeneratedNotification> {
  const fallback = FALLBACK_TEMPLATES[eventType]?.(metadata) ?? {
    title: 'SmartHire Notification',
    message: 'You have a new notification.',
    emailSubject: 'SmartHire Notification',
  };

  if (!useAI) return fallback;

  const client = getInsforgeClient();
  if (!client) return fallback;

  try {
    const contextLines = Object.entries(metadata)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
      .join('\n');

    const systemPrompt = `You are a notification copywriter for SmartHire, an AI recruitment platform.
Generate a concise, engaging notification for the event type "${eventType}".
Context:\n${contextLines}

Respond with ONLY valid JSON in this exact format:
{
  "title": "short catchy title (max 60 chars)",
  "message": "friendly message body (max 120 chars)",
  "emailSubject": "email subject line (max 80 chars)"
}`;

    const response = await client.ai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.7,
      maxTokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return fallback;

    const parsed = JSON.parse(content) as GeneratedNotification;
    if (parsed.title && parsed.message && parsed.emailSubject) {
      return parsed;
    }
    return fallback;
  } catch (err) {
    console.warn('[AI_NOTIFICATION] Insforge AI generation failed, using fallback:', err);
    return fallback;
  }
}
