/** @deprecated Use embed.worker.ts — kept for npm run worker:embed */
import { startEmbedWorkers } from "@/workers/embed.worker";

startEmbedWorkers().catch((e) => {
  console.error("[WORKER][EMBED] bootstrap failed:", e);
  process.exit(1);
});
