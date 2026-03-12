type BullConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
};

export function getBullConnectionOptions(redisUrl?: string): BullConnectionOptions | null {
  if (!redisUrl) return null;

  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === "rediss:";

  return {
    host: parsed.hostname,
    port: Number(parsed.port || (isTls ? 6380 : 6379)),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname && parsed.pathname !== "/" ? Number(parsed.pathname.slice(1)) : undefined,
    tls: isTls ? {} : undefined,
  };
}
