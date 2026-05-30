import { auth } from "@clerk/nextjs/server";
import type { User as DbUser } from "@prisma/client";
import {
  ensureApplicationUser,
  UnauthorizedError,
} from "@/lib/ensure-application-user";
import { resolveTenantId } from "@/lib/tenant-context";
import { ForbiddenError } from "@/auth/errors";

export type UserRole = "CANDIDATE" | "RECRUITER" | "HIRING_MANAGER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  candidateId?: string;
}

export interface AuthContext {
  clerkId: string;
  tenantId: string;
  user: AuthUser;
  dbUser: DbUser & { candidate: { id: string } | null };
}

function toAuthUser(dbUser: DbUser & { candidate: { id: string } | null }): AuthUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
    candidateId: dbUser.candidate?.id,
  };
}

export async function buildAuthContext(clerkId: string): Promise<AuthContext> {
  const [dbUser, tenantId] = await Promise.all([
    ensureApplicationUser(clerkId),
    resolveTenantId(),
  ]);

  return {
    clerkId,
    tenantId,
    user: toAuthUser(dbUser),
    dbUser,
  };
}

export class ClerkAuthHelper {
  static async getCurrentUser(): Promise<AuthUser | null> {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;
    const dbUser = await ensureApplicationUser(clerkId);
    return toAuthUser(dbUser);
  }

  static async getTenantId(): Promise<string> {
    return resolveTenantId();
  }

  static async requireRole(...roles: UserRole[]): Promise<AuthUser> {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new UnauthorizedError();
    const dbUser = await ensureApplicationUser(clerkId);
    const user = toAuthUser(dbUser);
    if (!roles.includes(user.role)) {
      throw new ForbiddenError();
    }
    return user;
  }

  static async getAuthContext(): Promise<AuthContext> {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new UnauthorizedError();
    return buildAuthContext(clerkId);
  }
}

export { UnauthorizedError, ForbiddenError };
