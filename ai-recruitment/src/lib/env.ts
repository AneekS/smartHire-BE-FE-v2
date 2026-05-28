import { z } from "zod";
import { getServerEnv } from "@/config/env";
import { getPipelineEnv, type PipelineEnv } from "@/config/pipeline-env";

const CoreEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  REDIS_URL: z.string().optional(),
  AZURE_SEARCH_ENDPOINT: z.string().optional(),
  AZURE_SEARCH_ADMIN_KEY: z.string().optional(),
  OLLAMA_POOL: z.string().optional(),
  OLLAMA_MAX_CONCURRENCY: z.coerce.number().int().positive().default(3),
  PII_ENCRYPTION_KEY: z.string().optional(),
  INTERNAL_DASHBOARD_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof CoreEnvSchema> & { pipeline: PipelineEnv };

let validated = false;

export function validateEnv(): AppEnv {
  const parsed = CoreEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment: ${parsed.error.issues.map((i) => i.message).join("; ")}`
    );
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    !process.env.PII_ENCRYPTION_KEY?.trim()
  ) {
    console.warn("[env] PII_ENCRYPTION_KEY not set — piiMaskEncrypted will not persist");
  }
  validated = true;
  getServerEnv();
  const pipeline = getPipelineEnv();
  return { ...parsed.data, pipeline };
}

export function getEnv(): AppEnv {
  if (!validated) return validateEnv();
  return { ...CoreEnvSchema.parse(process.env), pipeline: getPipelineEnv() };
}

/** Typed env singleton */
export const env = new Proxy({} as AppEnv, {
  get(_t, prop: keyof AppEnv) {
    return getEnv()[prop];
  },
});
