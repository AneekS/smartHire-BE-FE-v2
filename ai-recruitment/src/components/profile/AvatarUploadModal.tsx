"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, Trash2, Loader2, Camera, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAvatarUpload } from "@/hooks";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AvatarUploadModalProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl?:  string | null;
  name?:        string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// ─── Component ────────────────────────────────────────────────────────────────

export function AvatarUploadModal({
  open,
  onOpenChange,
  currentUrl,
  name,
}: AvatarUploadModalProps) {
  const { uploading, progress, upload, removeAvatar } = useAvatarUpload();

  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const fallbackAvatar = currentUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name ?? "user")}`;

  // ─── File validation & preview ────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    setValidationError(null);
    setDone(false);

    if (!ACCEPTED.includes(file.type)) {
      setValidationError("Only JPG, PNG, and WEBP images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setValidationError(`Image must be smaller than ${MAX_MB} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setPendingFile(file);
  }, []);

  // ─── Drag handlers ────────────────────────────────────────────────────────

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = () => setDragActive(false);
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ─── Input handler ────────────────────────────────────────────────────────

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  // ─── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!pendingFile) return;
    await upload(pendingFile);
    setDone(true);
    setPendingFile(null);
    // close after short delay so user sees success
    setTimeout(() => {
      onOpenChange(false);
      setPreview(null);
      setDone(false);
    }, 800);
  };

  // ─── Remove ───────────────────────────────────────────────────────────────

  const handleRemove = async () => {
    await removeAvatar();
    onOpenChange(false);
    setPreview(null);
  };

  // ─── Reset on close ───────────────────────────────────────────────────────

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPreview(null);
      setPendingFile(null);
      setValidationError(null);
      setDone(false);
    }
    onOpenChange(next);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const displaySrc = preview ?? fallbackAvatar;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Camera className="h-5 w-5 text-primary" />
            Profile Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Current / preview image */}
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={displaySrc}
                alt="Avatar preview"
                className="h-28 w-28 rounded-2xl object-cover border-4 border-slate-100 dark:border-slate-800 shadow-lg"
              />
              {done && (
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 shadow-md">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all cursor-pointer",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-slate-200 hover:border-primary/60 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Uploading… {progress}%
                </p>
                {/* Progress bar */}
                <div className="mt-1 h-1.5 w-full max-w-[180px] rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Drop photo here or{" "}
                    <span className="text-primary underline underline-offset-2">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    JPG, PNG, WEBP · max {MAX_MB} MB
                  </p>
                </div>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            hidden
            accept={ACCEPTED.join(",")}
            onChange={onFileChange}
          />

          {/* Validation error */}
          {validationError && (
            <p className="text-center text-xs font-medium text-destructive">
              {validationError}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {currentUrl && !pendingFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400"
                onClick={handleRemove}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={pendingFile ? handleUpload : () => inputRef.current?.click()}
              disabled={uploading || !!validationError}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {pendingFile ? "Upload Photo" : "Choose Photo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
