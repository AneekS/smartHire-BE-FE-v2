import { NextRequest, NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import {

  isDatabaseConnectionError,

  UnauthorizedError,

} from "@/lib/ensure-application-user";

import {

  buildAuthContext,

  type AuthContext,

  type AuthUser,

  type UserRole,

} from "@/auth/ClerkAuthHelper";

import { ForbiddenError } from "@/auth/errors";



export { UnauthorizedError, ForbiddenError, isDatabaseConnectionError };

export type { AuthUser, UserRole, AuthContext };

export { buildAuthContext };



export interface AuthenticatedRequest extends NextRequest {

  user?: AuthUser;

  tenantId?: string;

  clerkId?: string;

}



export type AuthHandler = (req: AuthenticatedRequest) => Promise<Response>;



/** Throws UnauthorizedError when session is missing (legacy auth-helpers API). */

export async function withAuthContext(_req?: NextRequest): Promise<AuthContext> {

  const { userId: clerkId } = await auth();

  if (!clerkId) throw new UnauthorizedError();

  return buildAuthContext(clerkId);

}



export async function withAuth(

  req: AuthenticatedRequest,

  handler: (req: AuthenticatedRequest) => Promise<Response>

): Promise<Response> {

  try {

    const { userId: clerkId } = await auth();

    if (!clerkId) {

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    }



    const ctx = await buildAuthContext(clerkId);

    req.user = ctx.user;

    req.tenantId = ctx.tenantId;

    req.clerkId = ctx.clerkId;



    return handler(req);

  } catch (error) {

    console.error("[withAuth]", error);

    if (error instanceof UnauthorizedError) {

      return NextResponse.json({ error: error.message }, { status: 401 });

    }

    if (error instanceof ForbiddenError) {

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    }

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

  role: UserRole,

  handler: (req: AuthenticatedRequest) => Promise<Response>

): Promise<Response> {

  return withAuth(req, async (authedReq) => {

    if (authedReq.user?.role !== role) {

      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    }

    return handler(authedReq);

  });

}


