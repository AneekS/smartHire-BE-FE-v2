import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface SessionUserLike {
  id?: string;
  email?: string | null;
  name?: string | null;
}

let userSyncFailures = 0;

export async function syncUser(sessionUser: SessionUserLike, requestId?: string) {
  if (!sessionUser?.id) return null;

  const rid = requestId ?? "sync-no-request-id";

  try {
    const userId = sessionUser.id;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (existing) {
      console.log(`[${rid}] [AUTH SYNC] User synced:`, existing.id);
      return existing;
    }

    const initialEmail = sessionUser.email?.trim() || `${userId}@placeholder.dev`;

    let created;
    try {
      created = await prisma.user.create({
        data: {
          id: userId,
          email: initialEmail,
          name: sessionUser.name?.trim() || "",
        },
      });
    } catch (error) {
      // Handle duplicate email conflicts gracefully by falling back to a guaranteed unique placeholder.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        created = await prisma.user.create({
          data: {
            id: userId,
            email: `${userId}@placeholder.dev`,
            name: sessionUser.name?.trim() || "",
          },
        });
      } else {
        throw error;
      }
    }

    console.log(`[${rid}] [AUTH SYNC] User synced:`, created.id);
    return created;
  } catch (error) {
    userSyncFailures += 1;
    console.error(`[${rid}] [AUTH SYNC][ERROR]`, error, {
      user_sync_failures: userSyncFailures,
    });
    throw error;
  }
}
