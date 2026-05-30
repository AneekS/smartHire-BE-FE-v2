import { vi } from 'vitest';

(globalThis as any).vi = vi;

// CI / local vitest: avoid Prisma import failures and slow Ollama embedding calls
process.env.DATABASE_URL ??=
  'postgresql://test:test@localhost:5432/smarthire_test?schema=public';
process.env.USE_OLLAMA_EMBEDDINGS = 'false';