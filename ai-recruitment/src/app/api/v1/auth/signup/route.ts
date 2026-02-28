import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import { createAuthRouteHandlers } from "@insforge/nextjs/api";
import { SignupSchema } from "@/lib/validators/auth.schema";
import { handleError } from "@/lib/errors";

const baseUrl =
  process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
  "https://2674danq.ap-southeast.insforge.app";
const insforge = createClient({ baseUrl });
const defaultHandlers = createAuthRouteHandlers({ baseUrl });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = SignupSchema.parse(body);

    if (!data.email) {
      return NextResponse.json(
        { error: "Email required for signup" },
        { status: 400 }
      );
    }

    const { data: authData, error } = await insforge.auth.signUp({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!authData?.user) {
      return NextResponse.json({ error: "Sign up failed" }, { status: 400 });
    }

    const client = createClient({
      baseUrl,
      edgeFunctionToken: authData.accessToken ?? undefined,
    });

    const { data: candidate, error: candidateError } = await client.database
      .from("candidates")
      .insert({
        id: authData.user.id,
        email: data.email,
        phone: data.phone ?? null,
        name: data.name,
      })
      .select()
      .single();

    if (candidateError) {
      console.error("Candidate creation failed:", candidateError);
    }

    const token = authData.accessToken;
    if (token) {
      const headers = new Headers(req.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return defaultHandlers.POST(
        new NextRequest(req.url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "sync-token",
            user: authData.user,
          }),
        })
      );
    }

    return NextResponse.json(
      {
        user: authData.user,
        candidate: candidate ?? null,
        requireEmailVerification: authData.requireEmailVerification,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: (e as { issues?: unknown }).issues },
        { status: 400 }
      );
    }
    return handleError(e);
  }
}
