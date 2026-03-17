/**
 * Email Service
 *
 * Sends transactional notification emails via Resend.
 * Selects the appropriate HTML template based on the event type.
 */

import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// ─── Resend singleton ─────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// ─── Template selection ───────────────────────────────────────────────────────

type TemplateName =
  | 'jobAlertEmail'
  | 'preferredRoleMatchEmail'
  | 'interviewEmail'
  | 'shortlistEmail'
  | 'offerEmail'
  | 'weeklyDigestEmail'
  | 'defaultEmail';

function selectTemplate(eventType: string): TemplateName {
  if (eventType === 'JOB_MATCH_FOUND') {
    return 'preferredRoleMatchEmail';
  }
  if (['JOB_POSTED', 'JOB_MATCH_FOUND', 'JOB_ALERT_DAILY_DIGEST', 'JOB_DEADLINE_ALERT'].includes(eventType)) {
    return 'jobAlertEmail';
  }
  if (['INTERVIEW_SCHEDULED', 'INTERVIEW_RESCHEDULED', 'INTERVIEW_REMINDER', 'INTERVIEW_RESULT'].includes(eventType)) {
    return 'interviewEmail';
  }
  if (['CANDIDATE_SHORTLISTED', 'APPLICATION_STATUS_UPDATED'].includes(eventType)) {
    return 'shortlistEmail';
  }
  if (['OFFER_RECEIVED', 'OFFER_DEADLINE'].includes(eventType)) {
    return 'offerEmail';
  }
  return 'defaultEmail';
}

// ─── Template renderer ────────────────────────────────────────────────────────

const TEMPLATES_DIR = path.join(process.cwd(), 'src/modules/notifications/templates');

function renderTemplate(
  templateName: TemplateName,
  vars: Record<string, string>,
): string {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  let html: string;

  try {
    html = fs.readFileSync(templatePath, 'utf-8');
  } catch {
    // Fallback: use default template
    const defaultPath = path.join(TEMPLATES_DIR, 'defaultEmail.html');
    html = fs.readFileSync(defaultPath, 'utf-8');
  }

  // Simple mustache-style variable replacement: {{variableName}}
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export interface SendNotificationEmailInput {
  to:           string;
  userName:     string;
  subject:      string;
  title:        string;
  message:      string;
  eventType:    string;
  metadata:     Record<string, unknown>;
  ctaUrl?:      string;
  ctaText?:     string;
}

export interface EmailDeliveryResult {
  success:       boolean;
  messageId?:    string;
  failureReason?: string;
}

export async function sendNotificationEmail(
  input: SendNotificationEmailInput,
): Promise<EmailDeliveryResult> {
  const resend = getResend();
  if (!resend) {
    return { success: false, failureReason: 'RESEND_API_KEY not configured' };
  }

  const template  = selectTemplate(input.eventType);
  const ctaUrl    = input.ctaUrl  ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://smarthireai.app'}/dashboard`;
  const ctaText   = input.ctaText ?? 'View on SmartHire';
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://smarthireai.app';

  const html = renderTemplate(template, {
    userName:    input.userName || 'there',
    title:       input.title,
    message:     input.message,
    ctaUrl,
    ctaText,
    appUrl,
    jobTitle:    String(input.metadata.jobTitle      ?? ''),
    companyName: String(input.metadata.companyName   ?? ''),
    scheduledAt: String(input.metadata.scheduledAt   ?? ''),
    meetingUrl:  String(input.metadata.meetingUrl    ?? ctaUrl),
    atsScore:    String(input.metadata.atsScore      ?? ''),
    offerAmount: input.metadata.offerSalary
      ? `${input.metadata.offerCurrency ?? 'USD'} ${Number(input.metadata.offerSalary).toLocaleString()}`
      : '',
    year:        new Date().getFullYear().toString(),
  });

  try {
    const { data, error } = await resend.emails.send({
      from:    `SmartHire <notifications@${process.env.RESEND_DOMAIN ?? 'mail.smarthireai.app'}>`,
      to:      input.to,
      subject: input.subject,
      html,
    });

    if (error) {
      return { success: false, failureReason: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, failureReason: message };
  }
}
