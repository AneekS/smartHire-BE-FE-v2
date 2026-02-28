import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import { createAuthRouteHandlers } from "@insforge/nextjs/api";

const baseUrl =
  process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
  "https://2674danq.ap-southeast.insforge.app";
const insforge = createClient({ baseUrl });
const defaultHandlers = createAuthRouteHandlers({ baseUrl });

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action !== "sign-in") {
    return NextResponse.json({ error: "Use action: sign-in" }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const result = await insforge.auth.signInWithPassword({ email, password });
  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 401 }
    );
  }
  if (!result.data?.user) {
    return NextResponse.json({ error: "Sign in failed" }, { status: 401 });
  }

  const token = result.data.accessToken;
  if (!token) {
    return NextResponse.json({
      user: result.data.user,
      requireEmailVerification: result.data.requireEmailVerification,
    });
  }

  const headers = new Headers(req.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return defaultHandlers.POST(
    new NextRequest(req.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "sync-token",
        user: result.data.user,
      }),
    })
  );
}
