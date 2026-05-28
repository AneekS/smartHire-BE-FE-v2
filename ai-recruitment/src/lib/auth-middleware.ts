import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  ensureApplicationUser,
  isDatabaseConnectionError,
} from "@/lib/ensure-application-user";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: "CANDIDATE" | "RECRUITER" | "ADMIN";
    candidateId?: string;
  };
}

export type AuthHandler = (
  req: AuthenticatedRequest
) => Promise<Response>;

export async function withAuth(
  req: AuthenticatedRequest,
  handler: (req: AuthenticatedRequest) => Promise<Response>
): Promise<Response> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureApplicationUser(clerkId);

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as "CANDIDATE" | "RECRUITER" | "ADMIN",
      candidateId: user.candidate?.id,
    };

    return handler(req);
  } catch (error) {
    console.error("[withAuth]", error);
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { error: "Database connection timed out. Check Azure PostgreSQL networking." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function withRole(
  req: AuthenticatedRequest,
  role: string,
  handler: (req: AuthenticatedRequest) => Promise<Response>
): Promise<Response> {
  return withAuth(req, async (authedReq) => {
    if (authedReq.user?.role !== role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(authedReq);
  });
}
