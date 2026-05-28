import { z } from "zod";

const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  OPENAI_API_KEY: z.string().optional(),
  AZURE_SEARCH_ENDPOINT: z.string().url().optional(),
  AZURE_SEARCH_ADMIN_KEY: z.string().optional(),
  AZURE_SEARCH_INDEX: z.string().optional(),
  CONFIDENCE_THRESHOLD: z.coerce.number().optional(),
  MAX_PARALLEL_WORKERS: z.coerce.number().optional(),
  CACHE_TTL_FILE: z.coerce.number().optional(),
  CACHE_TTL_EXTRACTION: z.coerce.number().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_POOL: z.string().optional(),
  OLLAMA_EXTRACTION_MODEL: z.string().optional(),
  OLLAMA_EMBED_MODEL: z.string().optional(),
  EMBED_VECTOR_DIMENSIONS: z.coerce.number().optional(),
  USE_OLLAMA_EMBEDDINGS: z.string().optional(),
  ASYNC_RESUME_PIPELINE: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
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
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid client env: ${formatZodIssues(parsed.error)}`);
  }
  clientEnvCache = parsed.data;
  return clientEnvCache;
}
