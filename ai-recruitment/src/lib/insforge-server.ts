import { createClient } from "@insforge/sdk";
import { auth } from "@insforge/nextjs/server";
import { getServerEnv } from "@/config/env";

const baseUrl = getServerEnv().NEXT_PUBLIC_INSFORGE_BASE_URL;

export async function getAuthenticatedClient() {
  const { token } = await auth();
  if (!token) return null;
  return createClient({
    baseUrl,
    edgeFunctionToken: token,
  });
}

export async function requireAuth() {
  const client = await getAuthenticatedClient();
  const { user } = await auth();
  if (!client || !user) {
    throw new Error("Unauthorized");
  }
  return { client, user };
}
