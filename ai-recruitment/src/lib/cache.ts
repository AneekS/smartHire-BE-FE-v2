/**
 * Application-layer cache is disabled (no Redis / no in-process TTL store).
 * Exports remain so legacy imports do not break; all operations are no-ops.
 */

export async function cacheGet<T>(_key: string): Promise<T | null> {
  return null;
}

export async function cacheSet(_key: string, _value: unknown, _ttlSeconds?: number): Promise<void> {
  return;
}

export async function cacheDelete(_key: string): Promise<void> {
  return;
}

export async function cacheHealth(): Promise<{
  mode: "disabled";
  ready: true;
  details?: string;
}> {
  return {
    mode: "disabled",
    ready: true,
    details: "Application cache disabled",
  };
}
