/**
 * GET  /api/notifications       — list notifications (paginated, filterable)
 * POST /api/notifications/mark-all-read — mark all as read
 */

import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { handleError } from '@/lib/errors';
import {
  listNotifications,
  markAllAsRead,
  getUnreadCount,
} from '@/modules/notifications/services/notification.service';
import { type NotificationCategory } from '@prisma/client';

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const url      = new URL(req.url);
      const category = url.searchParams.get('category') as NotificationCategory | null;
      const unread   = url.searchParams.get('unread') === 'true';
      const cursor   = url.searchParams.get('cursor') ?? undefined;
      const limit    = Number(url.searchParams.get('limit') ?? 20);

      const [result, unreadCount] = await Promise.all([
        listNotifications({
          userId:     authedReq.user!.id,
          category:   category ?? undefined,
          unreadOnly: unread,
          cursor,
          limit,
        }),
        getUnreadCount(authedReq.user!.id),
      ]);

      return NextResponse.json({ ...result, unreadCount });
    } catch (error) {
      return handleError(error);
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body   = await req.json().catch(() => ({}));
      const action = (body as { action?: string }).action;

      if (action === 'mark-all-read') {
        await markAllAsRead(authedReq.user!.id);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
      return handleError(error);
    }
  });
}
