"use client";

import { useState } from "react";
import { Bell, CheckCheck, Filter, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { cn, formatDistanceToNowSafe } from "@/components/notifications/notification-utils";
import Link from "next/link";

// ── Category config ────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "ALL",                label: "All",             icon: "🔔" },
  { value: "APPLICATION",        label: "Applications",    icon: "📋" },
  { value: "INTERVIEW",          label: "Interviews",      icon: "🎤" },
  { value: "JOB_ALERT",         label: "Job Alerts",      icon: "💼" },
  { value: "CAREER",            label: "Career",          icon: "🚀" },
  { value: "RECRUITER_ACTIVITY", label: "Recruiter",     icon: "👁️" },
  { value: "REMINDER",          label: "Reminders",       icon: "⏰" },
];

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  HIGH:   { label: "High",   cls: "bg-red-100 text-red-700 border-red-200"     },
  MEDIUM: { label: "Medium", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  LOW:    { label: "Low",    cls: "bg-slate-100 text-slate-600 border-slate-200"  },
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

// ── Notification row ───────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const priority = PRIORITY_LABELS[notification.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer group",
        notification.isRead
          ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
          : "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900 hover:border-indigo-200",
      )}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-base">
        {CATEGORY_ICONS[notification.category] ?? "🔔"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={cn("font-semibold text-sm", notification.isRead ? "text-slate-700 dark:text-slate-200" : "text-indigo-900 dark:text-indigo-100")}>
            {notification.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            )}
            <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-medium", priority?.cls)}>
              {priority?.label}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {formatDistanceToNowSafe(notification.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(activeCategory !== "ALL" ? activeCategory : undefined);

  const filtered = showUnreadOnly ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500">{unreadCount} unread</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-1.5 text-xs", showUnreadOnly && "bg-indigo-50 text-indigo-700")}
              onClick={() => setShowUnreadOnly((v) => !v)}
            >
              <Filter className="w-3.5 h-3.5" />
              {showUnreadOnly ? "All" : "Unread only"}
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => void markAllAsRead()}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}

            <Link href="/notifications/preferences">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                activeCategory === cat.value
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600",
              )}
            >
              <span className="text-base">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                {showUnreadOnly ? "No unread notifications" : "All caught up!"}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {showUnreadOnly
                  ? "You have no unread notifications in this category."
                  : "Check back later for new updates."}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => void markAsRead(id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
