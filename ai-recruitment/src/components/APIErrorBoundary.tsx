"use client";

import { Button } from "@/components/ui/button";

export function APIErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset?: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
      <p className="text-red-400 text-sm font-medium">{error.message}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => (reset ? reset() : window.location.reload())}
      >
        Retry
      </Button>
    </div>
  );
}
