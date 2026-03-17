/**
 * GET /api/notifications/preferences  — get notification preferences
 * PUT /api/notifications/preferences  — update notification preferences
 */

import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { handleError } from '@/lib/errors';
import {
  getOrCreatePreferences,
  updatePreferences,
} from '@/modules/notifications/services/notification.service';
import { z } from 'zod';

const PreferencesSchema = z.object({
  inAppEnabled:            z.boolean().optional(),
  emailEnabled:            z.boolean().optional(),
  jobAlerts:               z.boolean().optional(),
  interviewAlerts:         z.boolean().optional(),
  careerAlerts:            z.boolean().optional(),
  recruiterActivityAlerts: z.boolean().optional(),
  communityAlerts:         z.boolean().optional(),
  applicationAlerts:       z.boolean().optional(),
  reminderAlerts:          z.boolean().optional(),
});

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const prefs = await getOrCreatePreferences(authedReq.user!.id);
      return NextResponse.json({ preferences: prefs });
    } catch (error) {
      return handleError(error);
    }
  });
}

export async function PUT(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body  = await req.json();
      const data  = PreferencesSchema.parse(body);
      const prefs = await updatePreferences(authedReq.user!.id, data);
      return NextResponse.json({ preferences: prefs });
    } catch (error) {
      return handleError(error);
    }
  });
}
