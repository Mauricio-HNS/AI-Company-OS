import { startWorker } from "./jobs/worker.js";

const stop = startWorker({
  intervalMs: Number(process.env.AIOS_WORKER_INTERVAL_MS || 1000),
  workerId: process.env.AIOS_WORKER_ID || undefined
});

console.log("AI Company OS worker started");

function shutdown(signal) {
  console.log(`AI Company OS worker received ${signal}`);
  stop();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
