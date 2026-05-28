import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { User as DbUser } from "@prisma/client";
import {
  ensureApplicationUser,
  isDatabaseConnectionError,
  UnauthorizedError,
} from "@/lib/ensure-application-user";

export { isDatabaseConnectionError };

export { UnauthorizedError };

export type AuthenticatedContext = {
  clerkId: string;
  dbUser: DbUser;
};

export async function withAuth(_req?: NextRequest): Promise<AuthenticatedContext> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new UnauthorizedError();
  }

  const dbUser = await ensureApplicationUser(clerkId);
  return { clerkId, dbUser };
}
