import { db } from "../db/index.js";
import { id, now } from "../core/utils.js";

export function enqueueJob(type, payload = {}, options = {}) {
  const t = now();
  const job = {
    id: id(),
    company_id: options.companyId || null,
    type,
    payload: JSON.stringify(payload),
    status: "QUEUED",
    priority: Number.isFinite(Number(options.priority)) ? Number(options.priority) : 100,
    attempts: 0,
    max_attempts: Math.max(1, Number(options.maxAttempts) || 3),
    available_at: options.availableAt || t,
    locked_at: null,
    locked_by: null,
    started_at: null,
    finished_at: null,
    last_error: "",
    result: "{}",
    created_at: t,
    updated_at: t
  };
  db.prepare("INSERT INTO ai_jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(job));
  return job;
}

export function claimNextJob(workerId) {
  const t = now();
  const job = db.prepare(
    "SELECT * FROM ai_jobs WHERE status='QUEUED' AND available_at<=? ORDER BY priority ASC, created_at ASC LIMIT 1"
  ).get(t);
  if (!job) return null;

  const result = db.prepare(
    "UPDATE ai_jobs SET status='RUNNING',attempts=attempts+1,locked_at=?,locked_by=?,started_at=COALESCE(started_at,?),updated_at=? WHERE id=? AND status='QUEUED'"
  ).run(t, workerId, t, t, job.id);

  if (!result.changes) return null;
  return db.prepare("SELECT * FROM ai_jobs WHERE id=?").get(job.id);
}

export function completeJob(jobId, result = {}) {
  const t = now();
  db.prepare("UPDATE ai_jobs SET status='COMPLETED',finished_at=?,result=?,last_error='',updated_at=? WHERE id=?")
    .run(t, JSON.stringify(result), t, jobId);
}

export function failJob(jobId, error, retry = true) {
  const job = db.prepare("SELECT * FROM ai_jobs WHERE id=?").get(jobId);
  if (!job) return null;
  const t = now();
  const shouldRetry = retry && job.attempts < job.max_attempts;
  db.prepare("UPDATE ai_jobs SET status=?,available_at=?,finished_at=?,last_error=?,updated_at=? WHERE id=?")
    .run(shouldRetry ? "QUEUED" : "FAILED", shouldRetry ? t : job.available_at, shouldRetry ? null : t, String(error?.message || error), t, jobId);
  return shouldRetry;
}

export function getJob(jobId) {
  return db.prepare("SELECT * FROM ai_jobs WHERE id=?").get(jobId);
}

export function listJobs(companyId, limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  if (companyId) return db.prepare("SELECT * FROM ai_jobs WHERE company_id=? ORDER BY created_at DESC LIMIT ?").all(companyId, safeLimit);
  return db.prepare("SELECT * FROM ai_jobs ORDER BY created_at DESC LIMIT ?").all(safeLimit);
}
