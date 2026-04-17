import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { prisma } from "@/lib/db";
import type { User as DbUser } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

type AuthSession = Awaited<ReturnType<typeof requireAuth>>;

export type AuthenticatedContext = {
  user: AuthSession["user"];
  client: AuthSession["client"];
  dbUser: DbUser;
};

/**
 * Resolves InsForge session + Prisma user row (candidate_id for job_ats_scores).
 * @param _req reserved for future cookie/header reads
 */
export async function withAuth(_req?: NextRequest): Promise<AuthenticatedContext> {
  let session: AuthSession;
  try {
    session = await requireAuth();
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      throw new UnauthorizedError();
    }
    throw e;
  }

  const { user, client } = session;

  if (!user.email?.trim()) {
    throw new UnauthorizedError("Missing user email on session");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    throw new UnauthorizedError("User not found in application database");
  }

  return { user, client, dbUser };
}
