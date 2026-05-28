"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * Syncs Clerk → Postgres when the user enters the dashboard.
 * Webhooks are not required; /api/auth/sync uses the Clerk session + currentUser().
 */
export function ClerkDatabaseSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const lastSyncedId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    if (lastSyncedId.current === userId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/sync", { credentials: "include" });
        if (!res.ok) return;
        if (!cancelled) lastSyncedId.current = userId;
      } catch {
        // Retry on next mount / user change
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
