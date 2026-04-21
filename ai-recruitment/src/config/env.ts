import { z } from "zod";

const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_INSFORGE_BASE_URL: z.string().url("NEXT_PUBLIC_INSFORGE_BASE_URL must be a valid URL"),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_INSFORGE_ANON_KEY is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_INSFORGE_BASE_URL: z.string().url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1),
});

let serverEnvCache: z.infer<typeof ServerEnvSchema> | null = null;
let clientEnvCache: z.infer<typeof ClientEnvSchema> | null = null;

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function getServerEnv() {
  if (serverEnvCache) return serverEnvCache;
  const parsedServerEnv = ServerEnvSchema.safeParse(process.env);
  if (!parsedServerEnv.success) {
    throw new Error(`Invalid server env: ${formatZodIssues(parsedServerEnv.error)}`);
  }
  serverEnvCache = parsedServerEnv.data;
  return serverEnvCache;
}

export function getClientEnv() {
  if (clientEnvCache) return clientEnvCache;
  const parsed = ClientEnvSchema.safeParse({
    NEXT_PUBLIC_INSFORGE_BASE_URL: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid client env: ${formatZodIssues(parsed.error)}`);
  }
  clientEnvCache = parsed.data;
  return clientEnvCache;
}
