import type { ApiResponse } from "@/types/api.types";

export function ok<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function err(message: string, status = 400, details?: unknown): Response {
  const body: ApiResponse<never> = { success: false, error: message, details };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
