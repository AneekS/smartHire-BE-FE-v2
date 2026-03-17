/**
 * POST /api/notifications/test
 *
 * Development-only endpoint — pushes a test notification for the currently
 * signed-in user so you can verify the full stack without running workers.
 *
 * Returns 403 in production.
 *
 * Body (all optional):
 * {
 *   "event": "CANDIDATE_SHORTLISTED",   // default
 *   "jobTitle": "Senior Engineer",
 *   "companyName": "TechNova"
 * }
 */

import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { handleError } from '@/lib/errors';
import { generateNotificationContent } from '@/modules/notifications/services/aiNotification.service';
import { createNotification } from '@/modules/notifications/services/notification.service';
import { type NotificationEventType } from '@/modules/notifications/events/notification.events';
import { prisma } from '@/lib/db';

export async function POST(req: AuthenticatedRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return withAuth(req, async (authedReq) => {
    try {
      const body       = await req.json().catch(() => ({})) as Record<string, string>;
      const eventType  = (body.event ?? 'CANDIDATE_SHORTLISTED') as NotificationEventType;
      const userId     = authedReq.user!.id;

      // Fetch real user email / name for the notification
      const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { email: true, name: true },
      });

      const metadata = {
        jobTitle:     body.jobTitle     ?? 'Senior Software Engineer',
        companyName:  body.companyName  ?? 'TechNova',
        recruiterName: body.recruiterName ?? 'Sarah Chen',
        jobId:        'demo-job-001',
      };

      const { title, message } = await generateNotificationContent(eventType, metadata, true);

      await createNotification({
        userId,
        eventType,
        title,
        message,
        metadata,
        userEmail: user?.email,
        userName:  user?.name ?? undefined,
      });

      return NextResponse.json({
        success: true,
        event: eventType,
        title,
        message,
        metadata,
      });
    } catch (error) {
      return handleError(error);
    }
  });
}
