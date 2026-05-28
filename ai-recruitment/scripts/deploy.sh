#!/bin/sh
set -e

cd "$(dirname "$0")/.."

echo "[deploy] Validating environment..."
node -e "require('tsx/cjs'); import('@/lib/env').then(m => m.validateEnv())" 2>/dev/null || npx tsx -e "import { validateEnv } from './src/lib/env'; validateEnv();"

echo "[deploy] Database migrations..."
npx prisma migrate deploy
npx prisma generate

echo "[deploy] Starting workers (background)..."
npx tsx --import ./scripts/load-env.mjs src/workers/parse-resume.worker.ts &
npx tsx --import ./scripts/load-env.mjs src/workers/embed-chunks.worker.ts &
npx tsx --import ./scripts/load-env.mjs src/workers/resume-index.worker.ts &
npx tsx --import ./scripts/load-env.mjs src/workers/recommendationWorker.ts &
npx tsx --import ./scripts/load-env.mjs src/workers/analyticsWorker.ts &

echo "[deploy] Workers started. Run 'npm run start' for Next.js separately."
wait
