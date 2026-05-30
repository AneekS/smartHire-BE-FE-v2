/** @deprecated Use parse.worker.ts — kept for npm run worker:parse */
import { startParseWorker } from "@/workers/parse.worker";

startParseWorker().catch((e) => {
  console.error("[WORKER][PARSE] bootstrap failed:", e);
  process.exit(1);
});
