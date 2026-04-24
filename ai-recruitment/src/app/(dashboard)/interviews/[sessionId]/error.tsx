"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InterviewRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto size-6 text-destructive" />
        <h2 className="mt-3 font-display text-lg font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message || "Please try reloading this interview."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/interviews">Back to interviews</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
