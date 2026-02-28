import { createClient } from "@insforge/sdk";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

export const insforge = createClient({
  baseUrl: baseUrl || "https://2674danq.ap-southeast.insforge.app",
  anonKey: anonKey || "",
});

export const RESUMES_BUCKET = "resumes";
export const AVATARS_BUCKET = "avatars";
export const PARSED_DATA_BUCKET = "parsed-data";
