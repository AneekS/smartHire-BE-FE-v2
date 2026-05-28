import { getPipelineEnv } from "@/config/pipeline-env";

let active = 0;
const waiters: Array<() => void> = [];

function maxConcurrency(): number {
  const fromEnv = Number(process.env.OLLAMA_MAX_CONCURRENCY);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 3;
}

async function acquire(): Promise<void> {
  const limit = maxConcurrency();
  if (active < limit) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  active++;
}

function release(): void {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

/** Limit parallel Ollama extraction/embed calls (default 3). */
export async function withOllamaConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  void getPipelineEnv();
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export class OllamaConcurrencyManager {
  static run<T>(fn: () => Promise<T>): Promise<T> {
    return withOllamaConcurrency(fn);
  }

  static getActiveCount(): number {
    return active;
  }

  static getLimit(): number {
    return maxConcurrency();
  }
}
