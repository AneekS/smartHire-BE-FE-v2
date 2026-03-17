import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "./insforge-server";
import { withRequestId } from "@/lib/middleware/requestId";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: "CANDIDATE" | "RECRUITER" | "ADMIN";
    candidateId?: string;
  };
  requestId?: string;
}

export type AuthHandler = (
  req: AuthenticatedRequest
) => Promise<Response>;

export async function withAuth(
  req: AuthenticatedRequest,
  handler: (req: AuthenticatedRequest) => Promise<Response>
): Promise<Response> {
  const requestId = req.requestId ?? withRequestId(req);
  req.requestId = requestId;

  try {
    const { user } = await requireAuth(requestId);
    const role = (user as { user_metadata?: { role?: string } }).user_metadata?.role ?? "CANDIDATE";
    req.user = {
      id: user.id,
      email: user.email ?? "",
      role: role as "CANDIDATE" | "RECRUITER" | "ADMIN",
      candidateId: (user as { user_metadata?: { candidateId?: string } }).user_metadata?.candidateId ?? user.id,
    };
    return handler(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
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
