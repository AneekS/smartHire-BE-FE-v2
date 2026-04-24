"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function computeElapsed(startedAt: string | null | undefined): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export interface UseInterviewTimerOptions {
  startedAt?: string | null;
  running?: boolean;
  durationMinutes?: number;
}

export function useInterviewTimer({
  startedAt,
  running = true,
  durationMinutes,
}: UseInterviewTimerOptions = {}) {
  const [elapsed, setElapsed] = useState(() => computeElapsed(startedAt));

  useEffect(() => {
    setElapsed(computeElapsed(startedAt));
    if (!running) return;

    const tick = () => setElapsed(computeElapsed(startedAt));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, running]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const formattedTime = hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const limitSeconds = durationMinutes ? durationMinutes * 60 : null;
  const remainingSeconds = limitSeconds !== null ? Math.max(0, limitSeconds - elapsed) : null;
  const overLimit = limitSeconds !== null && elapsed > limitSeconds;

  return {
    elapsed,
    formattedTime,
    remainingSeconds,
    overLimit,
  };
}
