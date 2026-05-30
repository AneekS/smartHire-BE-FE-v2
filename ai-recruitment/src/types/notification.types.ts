import type { NotificationType } from "@prisma/client";

export type { NotificationType };

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Record<string, boolean>;
}
