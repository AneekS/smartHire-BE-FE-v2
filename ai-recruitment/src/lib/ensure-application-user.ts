import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import type { User as DbUser } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

type DbUserWithCandidate = DbUser & {
  candidate: { id: string } | null;
};

type ClerkProfile = {
  email: string;
  name: string;
  phone: string | null;
  image: string | null;
};

const syncInflight = new Map<string, Promise<DbUserWithCandidate>>();

async function getClerkProfile(): Promise<ClerkProfile> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new UnauthorizedError();
  }

  const email =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new UnauthorizedError("No email on Clerk account");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0];

  return {
    email,
    name,
    phone: clerkUser.phoneNumbers[0]?.phoneNumber ?? null,
    image: clerkUser.imageUrl ?? null,
  };
}

async function ensureCandidateForUser(
  user: DbUserWithCandidate,
  profile: Pick<ClerkProfile, "email" | "name" | "phone">
): Promise<DbUserWithCandidate> {
  if (user.candidate) {
    await prisma.candidate.update({
      where: { id: user.candidate.id },
      data: {
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
      },
    });
    return user;
  }

  const candidate = await prisma.candidate.create({
    data: {
      userId: user.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
    },
  });

  await prisma.profilePrivacy.create({
    data: { candidateId: candidate.id },
  });

  return prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { candidate: { select: { id: true } } },
  });
}

async function syncFromClerk(clerkId: string): Promise<DbUserWithCandidate> {
  const profile = await getClerkProfile();

  const user = await prisma.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      image: profile.image,
    },
    update: {
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      image: profile.image,
    },
    include: { candidate: { select: { id: true } } },
  });

  return ensureCandidateForUser(user, profile);
}

export type EnsureUserOptions = {
  /** Pull latest email/name/avatar from Clerk (used by GET /api/auth/sync). */
  forceSync?: boolean;
};

/**
 * Resolve User + Candidate for the signed-in Clerk user (no webhooks).
 * Hot path: one DB read when the user already exists — avoids Clerk API + upsert per request.
 */
export async function ensureApplicationUser(
  clerkId: string,
  options: EnsureUserOptions = {}
): Promise<DbUserWithCandidate> {
  if (!options.forceSync) {
    const existing = await prisma.user.findUnique({
      where: { clerkId },
      include: { candidate: { select: { id: true } } },
    });

    if (existing?.candidate) {
      return existing;
    }

    if (existing) {
      return ensureCandidateForUser(existing, {
        email: existing.email,
        name: existing.name ?? existing.email.split("@")[0],
        phone: existing.phone,
      });
    }
  }

  const inflightKey = `${clerkId}:${options.forceSync ? "force" : "create"}`;
  const pending = syncInflight.get(inflightKey);
  if (pending) return pending;

  const work = syncFromClerk(clerkId);
  syncInflight.set(inflightKey, work);

  try {
    return await work;
  } finally {
    syncInflight.delete(inflightKey);
  }
}

export function isDatabaseConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("timeout") ||
    message.includes("terminated") ||
    message.includes("P1001") ||
    message.includes("P1008") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND")
  );
}
