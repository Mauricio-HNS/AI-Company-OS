import crypto from "node:crypto";
import { claimNextJob, completeJob, failJob } from "./queue.js";
import { handleJob } from "./handlers.js";

export async function processOneJob(workerId = `worker-${crypto.randomUUID()}`) {
  const job = claimNextJob(workerId);
  if (!job) return null;
  try {
    const result = await handleJob(job);
    completeJob(job.id, result || {});
    return { jobId: job.id, status: "COMPLETED", result };
  } catch (error) {
    const retry = failJob(job.id, error, true);
    return { jobId: job.id, status: retry ? "RETRY_QUEUED" : "FAILED", error: error.message };
  }
}

export function startWorker(options = {}) {
  const intervalMs = Math.max(250, Number(options.intervalMs) || 1000);
  const workerId = options.workerId || `worker-${crypto.randomUUID()}`;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try { await processOneJob(workerId); } finally { running = false; }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();
  void tick();

  return () => clearInterval(timer);
}
