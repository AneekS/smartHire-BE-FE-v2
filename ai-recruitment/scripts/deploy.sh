#!/bin/sh
# Production container entrypoint: validate env, migrate, start Next.js + BullMQ workers.
# Zero-downtime: only backward-compatible migrations; backfill before NOT NULL constraints.
set -e

cd "$(dirname "$0")/.."

PIDS=""

cleanup() {
  echo "[deploy] Shutting down..."
  for pid in $PIDS; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}

trap cleanup INT TERM

echo "[deploy] Validating environment..."
npx tsx -e "import { validateEnv } from './src/lib/env'; validateEnv();"

echo "[deploy] Database migrations..."
npx prisma migrate deploy
npx prisma generate

echo "[deploy] Starting Next.js..."
npm run start &
NEXT_PID=$!
PIDS="$NEXT_PID"

start_worker() {
  npx tsx --import ./scripts/load-env.mjs "$1" &
  PIDS="$PIDS $!"
}

echo "[deploy] Starting BullMQ workers..."
start_worker src/workers/parse.worker.ts
start_worker src/workers/embed.worker.ts
start_worker src/workers/resume-index.worker.ts
start_worker src/workers/recommendations.worker.ts
start_worker src/workers/analytics.worker.ts
start_worker src/workers/cache.worker.ts
start_worker src/workers/app-tracker.worker.ts

echo "[deploy] Next.js PID=$NEXT_PID; workers running."
wait $NEXT_PID
