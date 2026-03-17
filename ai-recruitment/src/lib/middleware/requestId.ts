import { randomUUID } from "crypto";

export function withRequestId(req: Request): string {
  const existing = req.headers?.get?.("x-request-id");
  if (existing && existing.trim().length > 0) return existing.trim();
  return randomUUID();
}
