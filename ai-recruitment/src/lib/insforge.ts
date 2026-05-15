import { createClient } from "@insforge/sdk";
import { getClientEnv } from "@/config/env";

const { NEXT_PUBLIC_INSFORGE_BASE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY } = getClientEnv();

export const insforge = createClient({
  baseUrl: NEXT_PUBLIC_INSFORGE_BASE_URL,
  anonKey: NEXT_PUBLIC_INSFORGE_ANON_KEY,
});

export const RESUMES_BUCKET = "resumes";
export const AVATARS_BUCKET = "avatars";
export const PARSED_DATA_BUCKET = "parsed-data";
