import { createClient } from "@insforge/sdk";
import { auth } from "@insforge/nextjs/server";
import { syncUser } from "@/lib/auth/syncUser";

const baseUrl =
  process.env.NEXT_PUBLIC_INSFORGE_BASE_URL ||
  "https://2674danq.ap-southeast.insforge.app";

export async function getAuthenticatedClient() {
  const { token } = await auth();
  if (!token) return null;
  return createClient({
    baseUrl,
    edgeFunctionToken: token,
  });
}

export async function requireAuth(requestId?: string) {
  const client = await getAuthenticatedClient();
  const { user } = await auth();
  if (!client || !user) {
    throw new Error("Unauthorized");
  }
  await syncUser({
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
  }, requestId);
  return { client, user };
}
