"use client";

/**
 * useNotifications hook
 *
 * Fetches and manages notification state for the current user.
 * Supports real-time updates via SSE and periodic SWR polling as fallback.
 */

import useSWR from "swr";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Notification {
  id: string;
  type: string;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  nextCursor?: string;
  hasMore: boolean;
  unreadCount: number;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch notifications");
    return r.json() as Promise<NotificationsResponse>;
  });

export function useNotifications(category?: string) {
  const url = `/api/notifications${category ? `?category=${category}` : ""}`;

  const { data, mutate, isLoading } = useSWR<NotificationsResponse>(url, fetcher, {
    refreshInterval: 30_000, // Polling fallback every 30 s
    revalidateOnFocus: true,
  });

  const unreadCount  = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  // ── SSE real-time updates ──────────────────────────────────────────────────
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notification", () => {
      // Optimistically increment unread count, then revalidate
      void mutate();
    });

    es.onerror = () => {
      es.close();
    };

    esRef.current = es;
    return () => {
      es.close();
    };
  }, [mutate]);

  // ── Mark single as read ────────────────────────────────────────────────────
  const markAsRead = useCallback(
    async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      await mutate();
    },
    [mutate],
  );

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-all-read" }),
    });
    await mutate();
  }, [mutate]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: mutate,
  };
}

// ── Preferences hook ────────────────────────────────────────────────────────

export interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  jobAlerts: boolean;
  interviewAlerts: boolean;
  careerAlerts: boolean;
  recruiterActivityAlerts: boolean;
  communityAlerts: boolean;
  applicationAlerts: boolean;
  reminderAlerts: boolean;
}

const prefFetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json() as Promise<{ preferences: NotificationPreferences }>)
    .then((d) => d.preferences);

export function useNotificationPreferences() {
  const { data: preferences, mutate, isLoading } = useSWR<NotificationPreferences>(
    "/api/notifications/preferences",
    prefFetcher,
  );

  const [saving, setSaving] = useState(false);

  const updatePreferences = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      setSaving(true);
      try {
        await fetch("/api/notifications/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        await mutate();
      } finally {
        setSaving(false);
      }
    },
    [mutate],
  );

  return { preferences, isLoading, saving, updatePreferences };
}
