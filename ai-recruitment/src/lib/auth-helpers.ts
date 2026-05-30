/** @deprecated Import from @/lib/auth-middleware */
export {
  withAuthContext,
  UnauthorizedError,
  isDatabaseConnectionError,
  type AuthContext as AuthenticatedContext,
} from "@/lib/auth-middleware";

import type { NextRequest } from "next/server";
import { withAuthContext, type AuthContext } from "@/lib/auth-middleware";

/** Legacy shape: { clerkId, dbUser } */
export async function withAuth(_req?: NextRequest): Promise<{
  clerkId: string;
  dbUser: AuthContext["dbUser"];
}> {
  const ctx = await withAuthContext(_req);
  return { clerkId: ctx.clerkId, dbUser: ctx.dbUser };
}
