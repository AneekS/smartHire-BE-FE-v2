import { NextRequest, NextResponse } from "next/server";
import { auth } from "@insforge/nextjs/server";
import { requireAuth } from "./insforge-server";

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
    const { user } = await requireAuth();
    const role = (user as { user_metadata?: { role?: string } }).user_metadata?.role ?? "CANDIDATE";
    req.user = {
      id: user.id,
      email: user.email ?? "",
      role: role as "CANDIDATE" | "RECRUITER" | "ADMIN",
      candidateId: (user as { user_metadata?: { candidateId?: string } }).user_metadata?.candidateId ?? user.id,
    };
    return handler(req);
  } catch {
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
