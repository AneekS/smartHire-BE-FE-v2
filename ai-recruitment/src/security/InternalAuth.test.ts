import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { InternalAuth } from "@/security/InternalAuth";

function makeReq(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, { headers });
}

describe("InternalAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("authorizes bearer token when secret configured", () => {
    process.env.INTERNAL_DASHBOARD_SECRET = "secret-123";
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true });
    const req = makeReq("https://app.test/api/internal/dashboard", {
      authorization: "Bearer secret-123",
    });
    expect(InternalAuth.isInternalAuthorized(req)).toBe(true);
  });

  it("allows query secret in development", () => {
    process.env.INTERNAL_DASHBOARD_SECRET = "secret-123";
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true, writable: true });
    const req = makeReq("https://app.test/api/internal/dashboard?secret=secret-123");
    expect(InternalAuth.isInternalAuthorized(req)).toBe(true);
  });

  it("rejects when secret missing in production", () => {
    delete process.env.INTERNAL_DASHBOARD_SECRET;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true });
    const req = makeReq("https://app.test/api/internal/dashboard");
    expect(InternalAuth.isInternalAuthorized(req)).toBe(false);
  });
});
