/**
 * PATCH /api/notifications/[id]  — mark a single notification as read
 */

import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { handleError } from '@/lib/errors';
import { markAsRead } from '@/modules/notifications/services/notification.service';

export async function PATCH(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(req, async (authedReq) => {
    try {
      const { id } = await params;
      await markAsRead(id, authedReq.user!.id);
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error);
    }
  });
}
