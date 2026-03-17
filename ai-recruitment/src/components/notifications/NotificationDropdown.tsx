"use client";

import { CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { cn, formatDistanceToNowSafe } from "./notification-utils";

interface NotificationDropdownProps {
  onClose: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW:    "bg-slate-100 text-slate-600 border-slate-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  APPLICATION:        "📋",
  INTERVIEW:          "🎤",
  JOB_ALERT:         "💼",
  CAREER:            "🚀",
  RECRUITER_ACTIVITY:"👁️",
  COMMUNITY:         "🌐",
  REMINDER:          "⏰",
  SYSTEM:            "⚙️",
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
        !notification.isRead && "bg-indigo-50/40 dark:bg-indigo-950/20",
      )}
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm mt-0.5">
          {CATEGORY_ICONS[notification.category] ?? "🔔"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight", !notification.isRead && "text-indigo-900 dark:text-indigo-100")}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-slate-400">
              {formatDistanceToNowSafe(notification.createdAt)}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4 font-medium", PRIORITY_COLORS[notification.priority])}
            >
              {notification.priority}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

  const recent = notifications.slice(0, 8);

  return (
    <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
            onClick={() => void markAllAsRead()}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-100 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">🔔</div>
            <p className="text-sm text-slate-500">All caught up!</p>
            <p className="text-xs text-slate-400 mt-1">No new notifications.</p>
          </div>
        ) : (
          recent.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={(id) => void markAsRead(id)}
            />
          ))
        )}
      </div>

      {/* Footer link */}
      <div className="border-t border-slate-100 dark:border-slate-800 p-3">
        <Link href="/notifications" onClick={onClose}>
          <Button
            variant="ghost"
            className="w-full text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
          >
            View all notifications
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
