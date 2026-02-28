import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import { createAuthRouteHandlers } from "@insforge/nextjs/api";

const baseUrl =
  process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
  "https://2674danq.ap-southeast.insforge.app";

const insforge = createClient({ baseUrl });

const defaultHandlers = createAuthRouteHandlers({ baseUrl });

async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;
  if (action === "sign-up" && body.name) {
    const { email, password, name } = body;
    const result = await insforge.auth.signUp({ email, password, name });
    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
    if (!result.data?.user) {
      return NextResponse.json({ error: "Sign up failed" }, { status: 400 });
    }
    const token = result.data.accessToken;
    if (!token) {
      return NextResponse.json({
        user: result.data.user,
        requireEmailVerification: result.data.requireEmailVerification,
      });
    }
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");
    return defaultHandlers.POST(
      new NextRequest(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "sync-token",
          user: result.data.user,
        }),
      })
    );
  }
  return defaultHandlers.POST(request);
}

export const GET = defaultHandlers.GET;
export const DELETE = defaultHandlers.DELETE;
