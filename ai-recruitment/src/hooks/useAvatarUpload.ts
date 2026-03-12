"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { avatarApi } from "@/lib/api-client";
import { useProfile } from "./useProfile";

function appendCacheBuster(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

/**
 * Manages profile avatar upload / deletion.
 *
 * Returns:
 *  - uploading  – true while the network request is in-flight
 *  - progress   – simulated 0-100 upload progress (updated by interval)
 *  - upload()   – send a File, resolves with the new public URL
 *  - removeAvatar() – delete current avatar
 */
export function useAvatarUpload() {
  const { mutate } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File): Promise<string> => {
    setUploading(true);
    setProgress(0);

    // Simulate incremental progress while the real request runs
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 150);

    try {
      const { avatarUrl } = await avatarApi.upload(file);
      const updatedAvatar = appendCacheBuster(avatarUrl);

      await mutate(
        (current) =>
          current
            ? {
                ...current,
                avatarUrl: updatedAvatar,
                image: updatedAvatar,
              }
            : current,
        { revalidate: false }
      );

      setProgress(100);
      toast.success("Profile photo updated");
      void mutate();
      return updatedAvatar;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      throw e;
    } finally {
      clearInterval(timer);
      setUploading(false);
    }
  }, [mutate]);

  const removeAvatar = useCallback(async () => {
    try {
      await avatarApi.remove();

      await mutate(
        (current) =>
          current
            ? {
                ...current,
                avatarUrl: null,
                image: current.photoUrl ?? null,
              }
            : current,
        { revalidate: false }
      );

      toast.success("Profile photo removed");
      void mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove photo");
      throw e;
    }
  }, [mutate]);

  return { uploading, progress, upload, removeAvatar };
}
